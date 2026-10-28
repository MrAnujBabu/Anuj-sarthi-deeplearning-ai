// Browser-safe checkpoints for long interpretations: every finished Hindi part is kept on this device,
// so a stopped run (network drop, screen off, credits out, Stop) continues from where it stopped
// without paying again for parts that were already done.
import type { InterpretBrief } from './interpret-protocol';
import type { InterpreterId } from './interpreter-models';
import type { TimedSegment } from './youtube-hindi';

export type HeardMedia = { segments: TimedSegment[]; language: string; truncated: boolean; duration: number };
export type Checkpoint = {
  key: string; savedAt: number; title: string;
  /** Hindi per segment, '' where not done yet. */
  lines: string[];
  /** Start time (seconds) per segment, for the hour-by-hour view. */
  starts: number[];
  brief: InterpretBrief | null; briefModel?: string;
  /** Speech the listener already heard (uploads / website media), so listening is not paid for twice. */
  heard?: HeardMedia;
};

export type CheckpointInput =
  | { kind: 'link'; url: string }
  | { kind: 'text'; transcript: string; url?: string }
  | { kind: 'file'; file: { name: string; size: number; lastModified: number } };

function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

/** Same source + same interpreter + same review setting → same checkpoint. */
export function checkpointKey(input: CheckpointInput, engine: InterpreterId, quality: boolean) {
  const src = input.kind === 'link' ? `link|${input.url.trim()}`
    : input.kind === 'file' ? `file|${input.file.name}|${input.file.size}|${input.file.lastModified}`
    : `text|${hash(input.transcript.trim())}|${(input.url ?? '').trim()}`;
  return `${src}|${engine}|${quality ? 'review' : 'fast'}`;
}

export function doneCount(lines: string[]) { return lines.filter(l => l.trim()).length; }

/** True when a checkpoint has work saved but is not finished — worth offering "continue". */
export function isResumable(cp: Checkpoint | null | undefined): cp is Checkpoint {
  return !!cp && cp.lines.length > 0 && doneCount(cp.lines) > 0 && doneCount(cp.lines) < cp.lines.length;
}

export type HourSection = { hour: number; done: number; total: number };
/** Groups parts by hour of video, so a 10–24 hour video shows which hours are finished. */
export function hourSections(starts: number[], lines: string[]): HourSection[] {
  const map = new Map<number, HourSection>();
  starts.forEach((start, i) => {
    const hour = Math.max(0, Math.floor(start / 3600));
    const s = map.get(hour) ?? { hour, done: 0, total: 0 };
    s.total++; if (lines[i]?.trim()) s.done++;
    map.set(hour, s);
  });
  return [...map.values()].sort((a, b) => a.hour - b.hour);
}

/** Network drops, rate limits and server hiccups are worth an automatic continue; credits, denials and bad input are not. */
export function isTransientFailure(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  if (error instanceof TypeError) return true; // fetch failed / connection lost
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && (status === 429 || (status >= 500 && status !== 501));
}

/** Waits before each automatic continue (bounded; then the student continues by hand). */
export const AUTO_CONTINUE_DELAYS_MS = [5_000, 15_000, 30_000];

// ---------- device storage ----------

const DB = 'snapsolve-interpret-checkpoints';
const STORE = 'checkpoints';
const LIMIT = 12;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'key' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally { db.close(); }
}

function valid(v: unknown): v is Checkpoint {
  const c = v as Partial<Checkpoint> | null;
  return !!c && typeof c.key === 'string' && Array.isArray(c.lines) && c.lines.every(l => typeof l === 'string') && Array.isArray(c.starts);
}

export async function loadCheckpoint(key: string): Promise<Checkpoint | null> {
  const v = await tx('readonly', s => s.get(key) as IDBRequest<unknown>);
  return valid(v) ? v : null;
}

export async function saveCheckpoint(cp: Checkpoint) {
  await tx('readwrite', s => s.put(cp));
  const all = await tx('readonly', s => s.getAll() as IDBRequest<unknown[]>);
  const old = all.filter(valid).sort((a, b) => b.savedAt - a.savedAt).slice(LIMIT);
  for (const c of old) await tx('readwrite', s => s.delete(c.key));
}

export async function removeCheckpoint(key: string) { await tx('readwrite', s => s.delete(key)); }
