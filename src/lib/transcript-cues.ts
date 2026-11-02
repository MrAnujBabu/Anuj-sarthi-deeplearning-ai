// Browser-safe transcript parsing shared by YouTube captions, pasted subtitles and AI listening.
import type { TimedSegment } from './youtube-hindi';

export type Cue = { start: number; end: number; text: string };

/** Reads "1:02", "01:02:03", "1:02.5" or SRT/VTT "00:01:02,500" as seconds. */
export function parseClock(value: string): number | null {
  const m = value.trim().match(/^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const h = Number(m[1] ?? 0), min = Number(m[2]), s = Number(m[3]), frac = m[4] ? Number(`0.${m[4]}`) : 0;
  if (s >= 60 || (m[1] !== undefined && min >= 60)) return null;
  return h * 3600 + min * 60 + s + frac;
}

const isNoise = (text: string) => /^[[(（]\s*(?:music|silence|applause|laughter|inaudible|संगीत|तालियाँ)\s*[\])）]$/i.test(text.trim()) || /^♪+$/.test(text.trim());
const clean = (text: string) => text.replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').replace(/\s+/g, ' ').trim();

/** Closes each cue at the next cue's start when the source gives no end time. */
function finishCues(cues: Cue[], lastDuration = 5): Cue[] {
  const sorted = cues.filter(c => Number.isFinite(c.start) && c.text).sort((a, b) => a.start - b.start);
  return sorted.map((cue, i) => {
    const next = sorted[i + 1];
    const end = cue.end > cue.start ? cue.end : next ? next.start : cue.start + lastDuration;
    return { start: cue.start, end: next ? Math.min(Math.max(end, cue.start + 0.5), Math.max(next.start, cue.start + 0.5)) : end, text: cue.text };
  });
}

/** SRT and WebVTT subtitles. */
export function parseSubtitleFile(text: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = text.replace(/\r/g, '').replace(/^\uFEFF/, '').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const timing = lines.findIndex(l => l.includes('-->'));
    if (timing < 0) continue;
    const [a, b] = (lines[timing] ?? '').split('-->');
    const start = parseClock((a ?? '').trim()), end = parseClock((b ?? '').trim().split(/\s+/)[0] ?? '');
    const body = clean(lines.slice(timing + 1).join(' '));
    if (start === null || !body || isNoise(body)) continue;
    cues.push({ start, end: end ?? start, text: body });
  }
  return finishCues(cues);
}

/**
 * Timestamped plain text: YouTube "Show transcript" copies (time on its own line),
 * "[0:12] text", "0:12 text" and the AI listener's "[h:mm:ss] text" lines.
 */
export function parseTimestampedText(text: string): Cue[] {
  const cues: Cue[] = [];
  let pending: number | null = null;
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const inline = line.match(/^\[?\(?((?:\d{1,2}:)?\d{1,3}:\d{2}(?:[.,]\d{1,3})?)\]?\)?\s*[-–—:]?\s*(.*)$/);
    const at = inline ? parseClock(inline[1] ?? '') : null;
    if (inline && at !== null) {
      const body = clean(inline[2] ?? '');
      if (body) { if (!isNoise(body)) cues.push({ start: at, end: 0, text: body }); pending = null; }
      else pending = at;
      continue;
    }
    // YouTube transcript copies may include "2 minutes, 5 seconds" accessibility lines.
    if (/^(?:\d+\s+(?:minutes?|seconds?|hours?)(?:,?\s*|$))+$/i.test(line)) continue;
    const body = clean(line);
    if (!body || isNoise(body)) continue;
    if (pending !== null) { cues.push({ start: pending, end: 0, text: body }); pending = null; }
    else if (cues.length) { const last = cues[cues.length - 1]; if (last) last.text += ` ${body}`; }
  }
  return finishCues(cues);
}

/** Detects the pasted format; returns [] for untimed prose. */
export function parsePastedTranscript(text: string): Cue[] {
  if (/-->/.test(text)) { const cues = parseSubtitleFile(text); if (cues.length >= 2) return cues; }
  const cues = parseTimestampedText(text);
  return cues.length >= 2 ? cues : [];
}

export type ListenResult = { language: string; cues: Cue[]; truncated?: boolean };

/** Parses the AI listener's "LANG=xx" header plus timestamped lines. */
export function parseListenOutput(text: string, offset = 0): ListenResult {
  const language = text.match(/^\s*LANG\s*=\s*([a-z]{2,3}(?:-[A-Za-z]{2,4})?)/mi)?.[1]?.toLowerCase() ?? '';
  const body = text.replace(/^\s*LANG\s*=.*$/mi, '');
  const cues = parseTimestampedText(body).map(c => ({ start: c.start + offset, end: c.end + offset, text: c.text }));
  return { language, cues };
}

/**
 * Rolling captions (YouTube auto-captions, many SRT exports) repeat the previous line at the
 * start of the next cue. Returns only the words of `next` not already said at the end of `prev`.
 */
export function stripRepeatedLead(prev: string, next: string): string {
  const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const a = prev.split(/\s+/).filter(Boolean), b = next.split(/\s+/).filter(Boolean);
  for (let k = Math.min(a.length, b.length); k >= 1; k--) {
    let same = true;
    for (let i = 0; i < k; i++) if (norm(a[a.length - k + i] ?? '') !== norm(b[i] ?? '')) { same = false; break; }
    if (same && (k >= 2 || k === b.length)) return b.slice(k).join(' ');
  }
  return next;
}

/** Groups cues into ~window-second dubbing segments, never splitting a cue; repeated rolling lines are dropped. */
export function groupCues(cues: Cue[], windowSec = 30): TimedSegment[] {
  const out: TimedSegment[] = [];
  let said = '';
  for (const c of cues) {
    if (!c.text) continue;
    const text = said ? stripRepeatedLead(said, c.text) : c.text;
    said = `${said} ${c.text}`.split(/\s+/).slice(-60).join(' ');
    if (!text) { const last = out[out.length - 1]; if (last) last.end = Math.max(last.end, c.end); continue; }
    const last = out[out.length - 1];
    if (last && c.start - last.start < windowSec) { last.text += ` ${text}`; last.end = Math.max(last.end, c.end); }
    else out.push({ start: c.start, end: Math.max(c.end, c.start + 0.5), text });
  }
  // Windows never overlap: each ends no later than the next one starts.
  return out.map((seg, i) => {
    const next = out[i + 1];
    return next && seg.end > next.start ? { ...seg, end: Math.max(seg.start + 0.5, next.start) } : seg;
  });
}

/** Keeps whole segments while the running text fits the interpretation budget. */
export function capSegments(segments: TimedSegment[], maxChars: number) {
  let used = 0;
  const kept: TimedSegment[] = [];
  for (const seg of segments) {
    used += seg.text.length;
    if (used > maxChars && kept.length) break;
    kept.push(seg);
  }
  return { segments: kept, truncated: kept.length < segments.length };
}

/** Splits untimed prose into roughly equal chunks at sentence ends for parallel interpretation. */
export function chunkProse(text: string, max = 2500): string[] {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?।。？！]+[.!?।。？！]*/g) ?? [];
  const out: string[] = [];
  let cur = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > max) { if (cur) out.push(cur); cur = ''; for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max)); continue; }
    if ((cur ? `${cur} ${s}` : s).length > max) { out.push(cur); cur = s; } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

export type CaptionTrack = { baseUrl: string; languageCode: string; kind?: string; name?: unknown };

/**
 * Original-language human captions are the most faithful source. The auto-caption track
 * reveals the spoken language; prefer a human track in that language, then any human
 * track, then the auto captions themselves.
 */
export function pickCaptionTrack(tracks: CaptionTrack[]) {
  if (!tracks.length) return null;
  const asr = tracks.find(t => t.kind === 'asr');
  const human = tracks.filter(t => t.kind !== 'asr');
  const spoken = asr?.languageCode.split('-')[0];
  const pick = (spoken && human.find(t => t.languageCode.split('-')[0] === spoken))
    ?? human.find(t => t.languageCode.startsWith('en'))
    ?? human[0] ?? asr ?? tracks[0] ?? null;
  return pick ? { track: pick, automatic: pick.kind === 'asr' } : null;
}
