// Browser side of the answer-checking council: per-device cache + streaming hook.
// Results live only in this browser (no database load).
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCouncilLine, type CheckResult, type CouncilResult, type CouncilStage, type Source } from '@/lib/verify';

const CACHE_KEY = 'snapsolve.verify.v1';
const CACHE_MAX = 80;
/** Message ids auto-checked in this tab, so a re-render never pays twice. */
const autoTried = new Set<string>();

function readCache(): Record<string, CouncilResult> {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}

export function getCachedVerdict(id: string): CouncilResult | null {
  return readCache()[id] ?? null;
}

export function saveVerdict(id: string, result: CouncilResult) {
  try {
    const all = readCache();
    all[id] = result;
    const ids = Object.keys(all).sort((a, b) => (all[b]?.at ?? 0) - (all[a]?.at ?? 0));
    for (const old of ids.slice(CACHE_MAX)) delete all[old];
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch { /* storage full: keep the result in memory only */ }
}

export type CouncilState = {
  status: 'idle' | 'running' | 'done' | 'error';
  stage: CouncilStage | null;
  checks: CheckResult[];
  sources: Source[];
  result: CouncilResult | null;
  error: string | null;
};

const IDLE: CouncilState = { status: 'idle', stage: null, checks: [], sources: [], result: null, error: null };

export type CouncilRequest = { messageId: string; question: string; answer: string; images: string[] };

export function useCouncil(req: CouncilRequest, opts: { autoStart: boolean; enabled: boolean }) {
  const [state, setState] = useState<CouncilState>(IDLE);
  const ctrl = useRef<AbortController | null>(null);
  const reqRef = useRef(req);
  reqRef.current = req;

  useEffect(() => {
    const cached = getCachedVerdict(req.messageId);
    setState(cached ? { ...IDLE, status: 'done', result: cached, checks: cached.checks, sources: cached.sources } : IDLE);
  }, [req.messageId]);

  useEffect(() => () => ctrl.current?.abort(), []);

  const stop = useCallback(() => {
    ctrl.current?.abort();
    ctrl.current = null;
    setState((s) => (s.status === 'running' ? { ...IDLE } : s));
  }, []);

  const start = useCallback(async () => {
    const r = reqRef.current;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ ...IDLE, status: 'running', stage: 'search' });
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: r.question.slice(0, 12000), answer: r.answer.slice(0, 60000), images: r.images.slice(0, 2), mode: 'solve' }),
        signal: c.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(res.status === 402 ? 'AI credits are used up — answer check paused.' : j.error || 'Answer check is unavailable right now.');
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n')) >= 0) {
          const e = parseCouncilLine(buf.slice(0, i));
          buf = buf.slice(i + 1);
          if (!e || c.signal.aborted) continue;
          if (e.type === 'stage') setState((s) => ({ ...s, stage: e.stage }));
          else if (e.type === 'check') setState((s) => ({ ...s, checks: [...s.checks, e.check] }));
          else if (e.type === 'sources') setState((s) => ({ ...s, sources: e.sources }));
          else if (e.type === 'error') throw new Error(e.status === 402 ? 'AI credits are used up — answer check paused.' : e.message);
          else if (e.type === 'done') {
            finished = true;
            saveVerdict(r.messageId, e.result);
            setState({ ...IDLE, status: 'done', result: e.result, checks: e.result.checks, sources: e.result.sources });
          }
        }
      }
      if (!finished && !c.signal.aborted) throw new Error('The answer check stopped early. Please try again.');
    } catch (e) {
      if (c.signal.aborted) return;
      setState((s) => ({ ...s, status: 'error', error: e instanceof Error ? e.message : 'Answer check failed.' }));
    } finally {
      if (ctrl.current === c) ctrl.current = null;
    }
  }, []);

  useEffect(() => {
    if (!opts.autoStart || !opts.enabled || autoTried.has(req.messageId)) return;
    if (getCachedVerdict(req.messageId)) return;
    autoTried.add(req.messageId);
    void start();
  }, [opts.autoStart, opts.enabled, req.messageId, start]);

  return { state, start, stop };
}
