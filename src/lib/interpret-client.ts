// Browser orchestrator for the expert interpreter: link / transcript / device file → streamed simple Hindi.
// Server work streams as NDJSON; media without captions is heard piece by piece (browser-extracted audio).
import { readInterpretStream, InterpretStreamError, type InterpretBrief, type InterpretEvent, type InterpretResult, type SourceOrigin, type Stage } from './interpret-protocol';
import { groupCues, type Cue, type ListenResult } from './transcript-cues';
import type { InterpreterId } from './interpreter-models';
import type { DubSegment, TimedSegment } from './youtube-hindi';
import { AUTO_CONTINUE_DELAYS_MS, isTransientFailure, type Checkpoint, type HeardMedia } from './interpret-checkpoint';

export type RunInput =
  | { kind: 'link'; url: string; deepListen: boolean }
  | { kind: 'text'; transcript: string; url?: string }
  | { kind: 'file'; file: File };

export type RunState = {
  stage: Stage | 'idle'; message: string; listening: boolean;
  title: string; language: string; origin?: SourceOrigin; duration: number; truncated: boolean;
  videoId: string | null; mediaUrl?: string; pageUrl?: string;
  listen?: { reached: number; total?: number };
  brief?: InterpretBrief | null; briefModel?: string;
  timeline: TimedSegment[]; hindi: string[]; done: number; total: number;
  quality?: { reviewed: number; corrected: number };
  sourceKey?: string | undefined;
};

export const IDLE_STATE: RunState = { stage: 'idle', message: '', listening: false, title: '', language: '', duration: 0, truncated: false, videoId: null, timeline: [], hindi: [], done: 0, total: 0 };

/** Pure reducer so streamed events can be unit-tested and replayed. */
export function reduceEvent(state: RunState, event: InterpretEvent): RunState {
  switch (event.type) {
    case 'stage': return { ...state, stage: event.stage, message: event.message, listening: state.listening || event.stage === 'listen' };
    case 'listen': return { ...state, listen: { reached: event.reached, ...(event.total ? { total: event.total } : {}) } };
    case 'source': {
      const timeline = event.timeline ?? [];
      return { ...state, title: event.title || state.title, language: event.language, origin: event.origin, duration: event.duration, truncated: event.truncated,
        videoId: event.videoId ?? state.videoId, sourceKey: event.sourceKey, timeline, hindi: timeline.map(() => ''), total: event.segments, done: 0 };
    }
    case 'brief': return { ...state, brief: event.brief, ...(event.model ? { briefModel: event.model } : {}) };
    case 'segment': {
      if (event.index < 0 || event.index >= state.hindi.length) return state;
      const hindi = state.hindi.slice(); hindi[event.index] = event.hindi;
      return { ...state, hindi };
    }
    case 'progress': return { ...state, done: event.done, total: event.total };
    case 'quality': return { ...state, quality: { reviewed: event.reviewed, corrected: event.corrected } };
    case 'media': return { ...state, mediaUrl: event.mediaUrl, pageUrl: event.pageUrl, title: event.title || state.title };
    default: return state;
  }
}

/** Timed Hindi so far, for live playback while the interpretation continues. */
export function liveDub(state: RunState): DubSegment[] {
  return state.timeline.map((s, i) => ({ start: s.start, end: s.end, hindi: state.hindi[i] ?? '' }));
}

const LISTEN_PARALLEL = 3;
const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); }, { once: true });
});

async function listenPiece(wav: Blob, offset: number, signal: AbortSignal): Promise<ListenResult> {
  for (let attempt = 0; ; attempt++) {
    const form = new FormData();
    form.append('file', new File([wav], `piece-${Math.round(offset)}.wav`, { type: 'audio/wav' }));
    form.append('offset', String(offset));
    let res: Response;
    try { res = await fetch('/api/media-listen', { method: 'POST', body: form, signal }); }
    catch (error) { if (signal.aborted || attempt >= 2) throw error; await wait(1500 * (attempt + 1), signal); continue; }
    if (res.ok) return await res.json() as ListenResult;
    const body = await res.json().catch(() => ({})) as { error?: string };
    if ((res.status === 429 || res.status >= 500) && attempt < 2) { await wait(2000 * (attempt + 1), signal); continue; }
    throw new InterpretStreamError(body.error || `सुनना रुक गया (${res.status}).`, res.status);
  }
}

/** Extracts speech on the device and lets the listener hear pieces in parallel; returns 30-second timed segments. */
export async function listenToMedia(o: { file?: File; url?: string; signal: AbortSignal; onProgress(reached: number, total: number): void }) {
  const { extractSpeechPieces } = await import('./media-audio');
  const cues: Cue[] = []; let language = '';
  const queue: Promise<void>[] = []; let active = 0; const waiting: (() => void)[] = [];
  let heardSeconds = 0, total = 0, failure: unknown = null;
  const ctl = new AbortController();
  const stop = () => ctl.abort(o.signal.reason);
  o.signal.addEventListener('abort', stop, { once: true });
  const slot = async () => { while (active >= LISTEN_PARALLEL) await new Promise<void>(r => waiting.push(r)); active++; };
  const release = () => { active--; waiting.shift()?.(); };
  try {
    const info = await extractSpeechPieces({
      ...(o.file ? { file: o.file } : {}), ...(o.url ? { url: o.url } : {}), signal: ctl.signal,
      onProgress: (_seconds, t) => { total = t; },
      onPiece: piece => {
        queue.push((async () => {
          await slot();
          try {
            if (failure) return;
            const heard = await listenPiece(piece.wav, piece.offset, ctl.signal);
            cues.push(...heard.cues); language ||= heard.language;
            heardSeconds += piece.duration; o.onProgress(heardSeconds, total || heardSeconds);
          } catch (error) { failure ??= error; ctl.abort(); }
          finally { release(); }
        })());
      },
    });
    await Promise.all(queue);
    if (failure) throw failure;
    o.signal.throwIfAborted();
    const segments = groupCues(cues.sort((a, b) => a.start - b.start), 30);
    if (!segments.length) throw new InterpretStreamError('इस video में बोलने की आवाज़ नहीं मिली।', 422);
    return { segments, language, truncated: info.truncated, duration: info.duration };
  } catch (error) {
    if (failure) throw failure;
    throw error;
  } finally { o.signal.removeEventListener('abort', stop); }
}

type RunOptions = {
  input: RunInput; engine: InterpreterId; quality: boolean; signal: AbortSignal; onState(state: RunState): void;
  /** Saved progress from an earlier run of the same source; finished parts are skipped. */
  checkpoint?: Checkpoint | null;
  /** Called whenever there is new progress worth saving on the device. */
  onCheckpoint?(cp: Omit<Checkpoint, 'key' | 'savedAt'>): void;
};

/** Runs the full pipeline and returns the final result; state updates stream through onState. */
export async function runInterpretation(o: RunOptions): Promise<InterpretResult> {
  let state: RunState = { ...IDLE_STATE };
  let heard: HeardMedia | undefined = o.checkpoint?.heard;
  // Lines to resume from: the device checkpoint first, then whatever this run finished before a drop.
  let resumeLines: string[] | null = o.checkpoint?.lines.some(l => l.trim()) ? o.checkpoint.lines : null;
  let resumeSourceKey = o.checkpoint?.sourceKey;
  let resumeBrief: { brief: InterpretBrief | null; model?: string } | null = o.checkpoint?.brief ? { brief: o.checkpoint.brief, ...(o.checkpoint.briefModel ? { model: o.checkpoint.briefModel } : {}) } : null;
  const snapshot = () => {
    o.onCheckpoint?.({ title: state.title, lines: state.hindi, starts: state.timeline.map(t => t.start), brief: state.brief ?? null,
      ...(state.sourceKey ? { sourceKey: state.sourceKey } : {}),
      ...(state.briefModel ? { briefModel: state.briefModel } : {}), ...(heard ? { heard } : {}) });
  };
  const apply = (event: InterpretEvent) => {
    state = reduceEvent(state, event); o.onState(state);
    if (event.type === 'segment' || event.type === 'brief') snapshot();
  };
  const postOnce = async (body: Record<string, unknown>) => {
    const resume = resumeLines && resumeSourceKey ? { lines: resumeLines, sourceKey: resumeSourceKey, ...(resumeBrief?.brief ? { brief: resumeBrief.brief, briefModel: resumeBrief.model ?? '' } : {}) } : undefined;
    const res = await fetch('/api/youtube-hindi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engine: o.engine, quality: o.quality, ...body, ...(resume ? { resume } : {}) }), signal: o.signal });
    return readInterpretStream(res, apply, o.signal);
  };
  /** Network drops and busy errors continue automatically (bounded) from the last finished part. */
  const post = async (body: Record<string, unknown>) => {
    for (let attempt = 0; ; attempt++) {
      try { return await postOnce(body); }
      catch (error) {
        if (o.signal.aborted || !isTransientFailure(error) || attempt >= AUTO_CONTINUE_DELAYS_MS.length) throw error;
        if (state.hindi.some(l => l.trim())) resumeLines = state.hindi.slice();
        resumeSourceKey = state.sourceKey;
        if (state.brief) resumeBrief = { brief: state.brief, ...(state.briefModel ? { model: state.briefModel } : {}) };
        const delay = AUTO_CONTINUE_DELAYS_MS[attempt] ?? 30_000;
        apply({ type: 'stage', stage: state.stage === 'idle' ? 'source' : state.stage, message: `Connection/AI रुक गया — ${Math.round(delay / 1000)} सेकंड में जहाँ रुका वहीं से फिर शुरू कर रहा हूँ (${attempt + 1}/${AUTO_CONTINUE_DELAYS_MS.length})…` });
        await wait(delay, o.signal);
      }
    }
  };
  const listenThenInterpret = async (media: { file?: File; url?: string }, source: Record<string, string>, title: string) => {
    if (!heard) {
      apply({ type: 'stage', stage: 'listen', message: 'Gemini 4 Argon video की आवाज़ ध्यान से सुन रहा है…' });
      heard = await listenToMedia({ ...media, signal: o.signal, onProgress: (reached, total) => apply({ type: 'listen', reached, total }) });
      snapshot();
    }
    const final = await post({ segments: heard.segments, source, title, language: heard.language });
    if (final.type !== 'done') throw new InterpretStreamError('Video समझ नहीं आई।', 502);
    return { ...final.result, truncated: final.result.truncated || heard.truncated };
  };
  if (o.input.kind === 'file') {
    const file = o.input.file;
    apply({ type: 'stage', stage: 'source', message: `${file.name} इसी device पर खोल रहा हूँ…` });
    return listenThenInterpret({ file }, { kind: 'upload', fileName: file.name }, file.name.replace(/\.[^.]+$/, ''));
  }
  const first = o.input.kind === 'link'
    ? await post({ url: o.input.url, deepListen: o.input.deepListen })
    : await post({ transcript: o.input.transcript, url: o.input.url ?? '' });
  if (first.type === 'done') return first.result;
  return listenThenInterpret({ url: first.mediaUrl }, { kind: 'web', mediaUrl: first.mediaUrl, pageUrl: first.pageUrl }, first.title);
}
