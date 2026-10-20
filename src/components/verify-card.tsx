import { AlertTriangle, Check, ChevronDown, ExternalLink, HelpCircle, Loader2, MessageSquareReply, RotateCcw, ShieldCheck, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageResponse } from '@/components/ai-elements/message';
import { normalizeMath } from '@/lib/math-format';
import { COUNCIL_MODELS, correctionRequest, type CheckResult, type CouncilStage, type Verdict } from '@/lib/verify';
import type { CouncilState } from '@/lib/verify-client';

const VERDICT_UI: Record<Verdict, { label: string; Icon: typeof Check; tone: string }> = {
  verified: { label: 'Verified', Icon: ShieldCheck, tone: 'text-primary' },
  needs_fix: { label: 'Needs a correction', Icon: AlertTriangle, tone: 'text-destructive' },
  unsure: { label: 'Unsure', Icon: HelpCircle, tone: 'text-muted-foreground' },
};

const ROUND_LABEL: Record<CheckResult['round'], string> = { 1: 'Review', 2: 'After debate', 3: 'Final ruling' };

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/** Icon button for the answer actions row: start, stop, or show/hide the result. */
export function VerifyButton({ state, open, onStart, onStop, onToggle }: {
  state: CouncilState; open: boolean; onStart: () => void; onStop: () => void; onToggle: () => void;
}) {
  const btn = 'size-7 text-muted-foreground hover:text-foreground';
  if (state.status === 'running')
    return (
      <Button variant="ghost" size="icon" className={btn} aria-label="Stop answer check" title="Checking with Gemini, GPT and Claude — tap to stop" onClick={onStop}>
        <Loader2 className="size-3.5 animate-spin text-primary" />
      </Button>
    );
  if (state.status === 'done' && state.result) {
    const { Icon, tone, label } = VERDICT_UI[state.result.verdict];
    return (
      <Button variant="ghost" size="icon" className={btn} aria-label={`${label} — ${open ? 'hide' : 'show'} answer check`} aria-pressed={open} onClick={onToggle}>
        <Icon className={`size-3.5 ${tone}`} />
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon" className={btn} aria-label="Verify this answer with Gemini, GPT and Claude" title="Verify — Gemini + GPT check, Claude rules" onClick={onStart}>
      <ShieldCheck className="size-3.5" />
    </Button>
  );
}

function StepRow({ done, active, label, sub }: { done: boolean; active: boolean; label: string; sub?: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
        {done ? <Check className="size-3.5 text-primary" /> : active ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <span className="size-1.5 rounded-full bg-border" />}
      </span>
      <span className={`min-w-0 ${done || active ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
    </li>
  );
}

const STAGE_ORDER: CouncilStage[] = ['search', 'review', 'debate', 'ruling'];

function Progress({ state, onStop }: { state: CouncilState; onStop: () => void }) {
  const at = state.stage ? STAGE_ORDER.indexOf(state.stage) : 0;
  const r1 = state.checks.filter((c) => c.round === 1);
  const has = (role: CheckResult['role'], round: CheckResult['round']) => state.checks.some((c) => c.role === role && c.round === round);
  const reviewers = `${COUNCIL_MODELS.gemini.name} ${has('gemini', 1) ? '✓' : '…'} · ${COUNCIL_MODELS.openai.name} ${has('openai', 1) ? '✓' : '…'}`;
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <ol className="space-y-2 text-sm">
        <StepRow done={at > 0} active={at === 0} label="Searching live sources" sub="Perplexity + Parallel" />
        <StepRow done={at > 1 || r1.length >= 2} active={at === 1} label="Independent review" sub={reviewers} />
        {at >= 2 && <StepRow done={at > 2} active={at === 2} label="Debate round" sub="Each reviewer answers the other's objections" />}
        {at >= 3 && <StepRow done={false} active label={`${COUNCIL_MODELS.chair.name} rules`} sub="Accepts or rejects every objection" />}
      </ol>
      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onStop}><Square className="size-3" />Stop check</Button>
    </div>
  );
}

function Result({ state, onRecheck, onAskTutor }: { state: CouncilState; onRecheck: () => void; onAskTutor?: (text: string) => void }) {
  const r = state.result!;
  const { Icon, tone, label } = VERDICT_UI[r.verdict];
  const headline = r.verdict === 'verified' && r.decidedBy === 'all-agree' ? 'Verified by all 3 AIs' : label;
  const byRound = [1, 2, 3].map((n) => r.checks.filter((c) => c.round === n)).filter((g) => g.length);
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} />
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${tone}`}>{headline}</p>
          {r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}
        </div>
      </div>
      {r.issues.length > 0 && (
        <ul className="space-y-2">
          {r.issues.map((i, n) => (
            <li key={n} className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-sm">
              <div className="flex gap-1.5 text-muted-foreground"><X className="mt-1 size-3.5 shrink-0 text-destructive" /><MessageResponse className="min-w-0 text-sm line-through decoration-destructive/60">{normalizeMath(i.line)}</MessageResponse></div>
              <div className="mt-1.5 flex gap-1.5"><Check className="mt-1 size-3.5 shrink-0 text-primary" /><MessageResponse className="min-w-0 text-sm">{normalizeMath(i.fix)}</MessageResponse></div>
            </li>
          ))}
        </ul>
      )}
      {r.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Sources">
          {r.sources.slice(0, 6).map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" title={s.title ?? s.url}
              className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
              <ExternalLink className="size-3 shrink-0" /><span className="truncate">{host(s.url)}</span>
            </a>
          ))}
        </div>
      )}
      <details className="group text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />How the council decided
        </summary>
        <div className="mt-2 space-y-3 border-l-2 border-border pl-3">
          {byRound.map((group) => (
            <div key={group[0]!.round} className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{ROUND_LABEL[group[0]!.round]}</p>
              {group.map((c) => {
                const v = VERDICT_UI[c.verdict];
                return (
                  <p key={c.role} className="text-sm">
                    <span className="font-medium">{COUNCIL_MODELS[c.role].name}</span>
                    <span className={`ml-1.5 text-xs ${v.tone}`}>{c.failed ? 'unavailable' : v.label.toLowerCase()}</span>
                    {c.note && <span className="block text-muted-foreground">{c.note}</span>}
                  </p>
                );
              })}
            </div>
          ))}
        </div>
      </details>
      {r.verdict === 'needs_fix' && r.issues.length > 0 && onAskTutor && (
        <Button variant="outline" size="sm" className="h-9 w-full justify-center" onClick={() => onAskTutor(correctionRequest(r.issues))}>
          <MessageSquareReply className="size-4" />Ask the tutor to explain the correction
        </Button>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Claude's answer above is unchanged.</span>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onRecheck}><RotateCcw className="size-3" />Re-check</Button>
      </div>
    </div>
  );
}

/** Answer-check panel shown under an answer while checking or when opened. */
export function VerifyPanel({ state, onStart, onStop, onAskTutor }: { state: CouncilState; onStart: () => void; onStop: () => void; onAskTutor?: (text: string) => void }) {
  if (state.status === 'idle') return null;
  return (
    <section aria-label="Answer check" className="msg-in mt-2 w-full max-w-xl rounded-lg border border-border bg-card/70 p-3">
      {state.status === 'running' && <Progress state={state} onStop={onStop} />}
      {state.status === 'done' && state.result && <Result state={state} onRecheck={onStart} {...(onAskTutor ? { onAskTutor } : {})} />}
      {state.status === 'error' && (
        <div className="flex items-start gap-2 text-sm" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground">Answer check unavailable</p>
            <p className="text-muted-foreground">{state.error}</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={onStart}><RotateCcw className="size-3" />Retry</Button>
        </div>
      )}
    </section>
  );
}
