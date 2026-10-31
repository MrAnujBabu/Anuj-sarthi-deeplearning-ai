import { isSarvamVoice, type SarvamVoice } from './sarvam-speech';
import type { InterpretResult } from './interpret-protocol';
import { isInterpreterId } from './interpreter-models';

export type YouTubeResult = InterpretResult;
export type SavedYouTubeStudy = { version: 1; url: string; transcript: string; voice: SarvamVoice; result: YouTubeResult };
export type LibraryEntry = { key: string; savedAt: number; url: string; voice: SarvamVoice; result: YouTubeResult };

const isStr = (v: unknown) => typeof v === 'string';
const optStr = (v: unknown) => v === undefined || v === null || typeof v === 'string';

export function isYouTubeResult(r: unknown): r is YouTubeResult {
  if (!r || typeof r !== 'object') return false;
  const v = r as Partial<YouTubeResult>;
  if (!isStr(v.title) || !isStr(v.hindi) || !v.hindi?.trim() || typeof v.truncated !== 'boolean' || !optStr(v.videoId)) return false;
  if (v.dub !== undefined && !(Array.isArray(v.dub) && v.dub.every(s => s && Number.isFinite(s.start) && Number.isFinite(s.end) && s.start >= 0 && s.end >= s.start && typeof s.hindi === 'string'))) return false;
  if (v.original !== undefined && !(Array.isArray(v.original) && v.original.every(isStr) && (!v.dub || v.original.length === v.dub.length))) return false;
  if (v.engine !== undefined && !isInterpreterId(v.engine)) return false;
  if (v.source !== undefined && !(v.source && typeof v.source === 'object' && isStr(v.source.kind) && isStr(v.source.origin))) return false;
  if (v.panel !== undefined && !(v.panel && typeof v.panel === 'object' && Array.isArray(v.panel.interpreters))) return false;
  if (v.brief !== undefined && v.brief !== null && !(typeof v.brief === 'object' && Array.isArray(v.brief.glossary) && Array.isArray(v.brief.corrections))) return false;
  return true;
}

export function isSavedYouTubeStudy(value: unknown): value is SavedYouTubeStudy {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SavedYouTubeStudy>;
  return v.version === 1 && isStr(v.url) && isStr(v.transcript) && isSarvamVoice(v.voice) && isYouTubeResult(v.result);
}

function isLibraryEntry(value: unknown): value is LibraryEntry {
  const v = value as Partial<LibraryEntry> | null;
  return !!v && isStr(v.key) && Number.isFinite(v.savedAt) && isStr(v.url) && isSarvamVoice(v.voice) && isYouTubeResult(v.result);
}

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('snapsolve-youtube-study', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('study')) db.createObjectStore('study');
      if (!db.objectStoreNames.contains('library')) db.createObjectStore('library', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}

function read<T>(store: string, key: IDBValidKey) {
  return open().then(db => new Promise<T | undefined>((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined); req.onerror = () => reject(req.error);
  }).finally(() => db.close()));
}

/** Latest completed lecture stays on-device, like existing browser study threads. */
export async function saveYouTubeStudy(value: SavedYouTubeStudy) {
  if (!isSavedYouTubeStudy(value)) throw new Error('Invalid YouTube study.');
  const db = await open();
  try { const tx = db.transaction('study', 'readwrite'); tx.objectStore('study').put(value, 'latest'); await done(tx); }
  finally { db.close(); }
}

export async function loadYouTubeStudy(): Promise<SavedYouTubeStudy | undefined> {
  const value = await read<unknown>('study', 'latest');
  return isSavedYouTubeStudy(value) ? value : undefined;
}

/** Device library of finished interpretations; oldest entries beyond the cap are removed. */
export const LIBRARY_LIMIT = 40;

export function libraryKey(result: Pick<YouTubeResult, 'videoId' | 'title' | 'source' | 'sourceKey'>, url: string, transcript: string) {
  if (result.sourceKey) return `interpretation:${result.sourceKey}${result.source?.mediaId ? `:${result.source.mediaId}` : ''}`;
  if (result.videoId) return `video:${result.videoId}`;
  if (result.source?.fileName) return `file:${result.source.fileName}`;
  if (url.trim()) return `url:${url.trim()}`;
  let h = 0; for (let i = 0; i < transcript.length; i++) h = (h * 31 + transcript.charCodeAt(i)) | 0;
  return `text:${h}`;
}

export async function saveToLibrary(entry: LibraryEntry) {
  if (!isLibraryEntry(entry)) throw new Error('Invalid library entry.');
  const db = await open();
  try {
    const tx = db.transaction('library', 'readwrite'); const store = tx.objectStore('library');
    store.put(entry);
    const all = await new Promise<LibraryEntry[]>((resolve, reject) => { const r = store.getAll(); r.onsuccess = () => resolve(r.result as LibraryEntry[]); r.onerror = () => reject(r.error); });
    all.sort((a, b) => b.savedAt - a.savedAt).slice(LIBRARY_LIMIT).forEach(old => store.delete(old.key));
    await done(tx);
  } finally { db.close(); }
}

export async function listLibrary(): Promise<LibraryEntry[]> {
  const db = await open();
  try {
    const all = await new Promise<unknown[]>((resolve, reject) => { const r = db.transaction('library').objectStore('library').getAll(); r.onsuccess = () => resolve(r.result as unknown[]); r.onerror = () => reject(r.error); });
    return all.filter(isLibraryEntry).sort((a, b) => b.savedAt - a.savedAt);
  } finally { db.close(); }
}

export async function removeFromLibrary(key: string) {
  const db = await open();
  try { const tx = db.transaction('library', 'readwrite'); tx.objectStore('library').delete(key); await done(tx); }
  finally { db.close(); }
}

/** The latest uploaded video stays on the device so its Hindi voice-over can replay after refresh. */
export const MEDIA_LIMIT_BYTES = 600 * 1024 * 1024;
export type SavedMedia = { name: string; type: string; blob: Blob; id?: string };

export async function saveUploadedMedia(media: SavedMedia) {
  if (media.blob.size > MEDIA_LIMIT_BYTES) return false;
  const db = await open();
  try { const tx = db.transaction('media', 'readwrite'); tx.objectStore('media').put(media, 'latest'); await done(tx); return true; }
  finally { db.close(); }
}

export async function loadUploadedMedia(): Promise<SavedMedia | undefined> {
  const v = await read<SavedMedia>('media', 'latest');
  return v && v.blob instanceof Blob && isStr(v.name) ? v : undefined;
}
