// Browser-safe NDJSON protocol between /api/youtube-hindi and the interpreter page.
import type { DubSegment, TimedSegment } from './youtube-hindi';
import type { InterpreterId } from './interpreter-models';

export type GlossaryItem = { term: string; hindi: string };
export type Correction = { heard: string; correct: string };
export type InterpretBrief = { language: string; domain: string; summary: string; glossary: GlossaryItem[]; corrections: Correction[] };

export type SourceKind = 'youtube' | 'web' | 'upload' | 'text';
export type SourceOrigin = 'captions' | 'auto-captions' | 'listened' | 'subtitles' | 'pasted';
export type SourceInfo = {
  kind: SourceKind; origin: SourceOrigin; language?: string;
  mediaUrl?: string; pageUrl?: string; fileName?: string;
};
export type PanelInfo = { listener?: string; terminologist?: string; interpreters: string[]; reviewers?: string[]; reviewed?: number; corrected?: number };

export type InterpretResult = {
  title: string; hindi: string; truncated: boolean; videoId?: string | null; dub?: DubSegment[];
  sourceChars?: number; source?: SourceInfo; brief?: InterpretBrief | null; panel?: PanelInfo;
  /** Original-language text for each dub segment, in the same order. */
  original?: string[]; engine?: InterpreterId;
};

export type Stage = 'source' | 'listen' | 'brief' | 'interpret';

export type InterpretEvent =
  | { type: 'stage'; stage: Stage; message: string }
  | { type: 'quality'; reviewed: number; corrected: number }
  | { type: 'listen'; reached: number; total?: number }
  | { type: 'source'; title: string; language: string; origin: SourceOrigin; segments: number; duration: number; truncated: boolean; videoId?: string | null; timeline?: TimedSegment[] }
  | { type: 'brief'; brief: InterpretBrief | null; model?: string }
  | { type: 'progress'; done: number; total: number }
  | { type: 'segment'; index: number; start: number; end: number; hindi: string; original: string }
  | { type: 'media'; mediaUrl: string; title: string; pageUrl: string; captionsUrl?: string }
  | { type: 'done'; result: InterpretResult }
  | { type: 'error'; error: string; status: number; needTranscript?: boolean };

export function encodeEvent(event: InterpretEvent) {
  return `${JSON.stringify(event)}\n`;
}

export class InterpretStreamError extends Error {
  constructor(message: string, public status: number, public needTranscript = false) { super(message); }
}

/** Reads NDJSON events until the stream ends; returns the terminal done/media event. */
export async function readInterpretStream(response: Response, onEvent: (event: InterpretEvent) => void, signal?: AbortSignal) {
  if (!response.ok && !(response.headers.get('content-type') ?? '').includes('ndjson')) {
    const body = await response.json().catch(() => ({})) as { error?: string; needTranscript?: boolean };
    throw new InterpretStreamError(body.error || `Request failed (${response.status})`, response.status, !!body.needTranscript);
  }
  if (!response.body) throw new InterpretStreamError('No response.', 502);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let terminal: Extract<InterpretEvent, { type: 'done' | 'media' }> | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    let event: InterpretEvent;
    try { event = JSON.parse(line) as InterpretEvent; } catch { return; }
    if (event.type === 'error') throw new InterpretStreamError(event.error, event.status, !!event.needTranscript);
    if (event.type === 'done' || event.type === 'media') terminal = event;
    onEvent(event);
  };
  try {
    for (;;) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let i: number;
      while ((i = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, i); buffer = buffer.slice(i + 1); handle(line); }
    }
    handle(buffer + decoder.decode());
  } finally {
    reader.cancel().catch(() => {});
  }
  if (!terminal) throw new InterpretStreamError('Connection ended early. Please try again.', 502);
  return terminal as Extract<InterpretEvent, { type: 'done' | 'media' }>;
}
