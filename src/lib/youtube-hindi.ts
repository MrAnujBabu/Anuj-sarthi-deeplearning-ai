// Browser-safe helpers for the YouTube → simple Hindi audio feature.

/** Extracts the 11-character video ID from any common YouTube link (or a bare ID). */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let url: URL;
  try { url = new URL(s.startsWith('http') ? s : `https://${s}`); } catch { return null; }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v');
    if (!id) {
      const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
      id = m?.[2] ?? null;
    }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** Decodes the timedtext XML YouTube serves into plain transcript text. */
export function timedTextToPlain(xml: string): string {
  const parts = [...xml.matchAll(/<(?:p|text)\b[^>]*>([\s\S]*?)<\/(?:p|text)>/g)].map(m => m[1] ?? '');
  return parts
    .map(p => p.replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))))
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

/** Splits Hindi text into speakable pieces under the speech limit, cutting at sentence ends (। . ? !). */
export function splitForSpeech(text: string, max = 1200): string[] {
  const sentences = text.replace(/\s+/g, ' ').match(/[^।.!?]+[।.!?]*/g) ?? [];
  const out: string[] = [];
  let cur = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > max) {
      if (cur) { out.push(cur); cur = ''; }
      for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
      continue;
    }
    if ((cur + ' ' + s).trim().length > max) { out.push(cur); cur = s; }
    else cur = (cur + ' ' + s).trim();
  }
  if (cur) out.push(cur);
  return out;
}

/** Longest transcript interpreted (about four hours of fast podcast speech); longer videos are cut and the page says so. */
export const MAX_TRANSCRIPT_CHARS = 260000;
/** Longest stretch of audio/video the AI listener hears when a video has no usable captions. */
export const MAX_MEDIA_SECONDS = 45 * 60;
/** Uploaded and web media are heard in 5-minute pieces so each request stays small. */
export const AUDIO_CHUNK_SECONDS = 300;

export type TimedSegment = { start: number; end: number; text: string };
export type DubSegment = { start: number; end: number; hindi: string };

function decodeEntities(s: string) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ').trim();
}

/** Reads timed captions (format 3 ms or legacy seconds) as individual cues, dropping [Music]-style tags. */
export function timedTextCues(xml: string): TimedSegment[] {
  const cues: TimedSegment[] = [];
  for (const m of xml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const t = Number(/\bt="(\d+)"/.exec(m[1] ?? '')?.[1]); const d = Number(/\bd="(\d+)"/.exec(m[1] ?? '')?.[1] ?? 0);
    const text = decodeEntities(m[2] ?? '');
    if (Number.isFinite(t) && text && !/^\[[^\]]*\]$/.test(text)) cues.push({ start: t / 1000, end: (t + d) / 1000, text });
  }
  if (!cues.length) for (const m of xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const s = Number(/start="([\d.]+)"/.exec(m[1] ?? '')?.[1]); const d = Number(/dur="([\d.]+)"/.exec(m[1] ?? '')?.[1] ?? 0);
    const text = decodeEntities(m[2] ?? '');
    if (Number.isFinite(s) && text && !/^\[[^\]]*\]$/.test(text)) cues.push({ start: s, end: s + d, text });
  }
  return cues;
}

/** Groups timed captions into ~window-second segments for dubbing. */
export function timedSegments(xml: string, windowSec = 30): TimedSegment[] {
  const out: TimedSegment[] = [];
  for (const c of timedTextCues(xml)) {
    const last = out[out.length - 1];
    if (last && c.start - last.start < windowSec) { last.text += ' ' + c.text; last.end = Math.max(last.end, c.end); }
    else out.push({ ...c });
  }
  return out;
}

/** Parses "### n" numbered blocks from the model into one Hindi string per segment (missing → ""). */
export function parseNumberedBlocks(text: string, count: number): string[] {
  const out = Array<string>(count).fill('');
  const re = /###\s*(\d+)\s*\n?([\s\S]*?)(?=###\s*\d+|$)/g;
  for (const m of text.matchAll(re)) { const i = Number(m[1]) - 1; if (i >= 0 && i < count) out[i] = (m[2] ?? '').trim(); }
  return out;
}
