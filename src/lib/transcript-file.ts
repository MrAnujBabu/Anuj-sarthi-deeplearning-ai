// Browser-safe: turns an attached transcript/notes file into plain transcript text, or flags media for listening.
// PDF/DOCX/OCR libraries load lazily, only when such a file is attached.

export const TRANSCRIPT_TEXT_LIMIT = 400_000;
export const TRANSCRIPT_FILE_BYTES = 30 * 1024 * 1024;
export const TRANSCRIPT_ACCEPT = '.md,.markdown,.txt,.srt,.vtt,.sbv,.pdf,.docx,.pptx,text/*,application/pdf,video/*,audio/*';

const MEDIA_EXT = /\.(mp4|m4v|mov|webm|mkv|avi|3gp|mp3|m4a|aac|wav|ogg|oga|opus|flac|amr)$/i;
const SUBTITLE_EXT = /\.(srt|vtt|sbv)$/i;
const MARKDOWN_EXT = /\.(md|markdown)$/i;
const PLAIN_EXT = /\.(txt|text|log)$/i;
const OFFICE_EXT = /\.(docx|pptx)$/i;

export type TranscriptFileKind = 'media' | 'subtitles' | 'markdown' | 'text' | 'pdf' | 'office' | 'unsupported';

export function classifyTranscriptFile(file: { name: string; type: string }): TranscriptFileKind {
  const { name, type } = file;
  if (type.startsWith('video/') || type.startsWith('audio/') || MEDIA_EXT.test(name)) return 'media';
  if (SUBTITLE_EXT.test(name)) return 'subtitles';
  if (MARKDOWN_EXT.test(name) || type === 'text/markdown') return 'markdown';
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  if (OFFICE_EXT.test(name)) return 'office';
  if (PLAIN_EXT.test(name) || type.startsWith('text/')) return 'text';
  return 'unsupported';
}

/** Markdown notes → readable transcript prose (keeps words, drops formatting and front matter). */
export function markdownToTranscript(md: string) {
  return md
    .replace(/^\uFEFF/, '')
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_m, a: string, b: string) => b || a)
    .replace(/^>\s?\[![^\]]+\][+-]?\s?/gm, '')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/^\s*([-*_]\s*){3,}$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Removes page markers/OCR notes added by the PDF reader so they are not interpreted as speech. */
export function cleanPdfText(text: string) {
  return text.replace(/^\[Page \d+\]\s*$/gm, '').replace(/^\[OCR:[^\]]*\]\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

export type TranscriptFileResult =
  | { kind: 'media'; file: File }
  | { kind: 'text'; text: string; truncated: boolean; scanned: boolean; pages?: number };

export class TranscriptFileError extends Error {}

export function limitTranscript(text: string) {
  return text.length > TRANSCRIPT_TEXT_LIMIT ? { text: text.slice(0, TRANSCRIPT_TEXT_LIMIT), truncated: true } : { text, truncated: false };
}

/** Reads an attached file on this device. Media files are returned untouched for the listening path. */
export async function readTranscriptFile(file: File, progress: (message: string) => void): Promise<TranscriptFileResult> {
  const kind = classifyTranscriptFile(file);
  if (kind === 'media') return { kind: 'media', file };
  if (kind === 'unsupported') throw new TranscriptFileError('यह file type नहीं चलता। MD, TXT, SRT, VTT, PDF, DOCX या कोई video/audio file लगाएँ।');
  if (file.size > TRANSCRIPT_FILE_BYTES) throw new TranscriptFileError('File 30 MB से बड़ी है। छोटी file लगाएँ।');
  if (!file.size) throw new TranscriptFileError('File खाली है।');
  let raw = '', scanned = false, pages: number | undefined;
  if (kind === 'pdf') {
    progress('PDF पढ़ रहा हूँ…');
    const { readVoicePdf } = await import('./voice-pdf');
    try {
      const reading = await readVoicePdf(file, true, message => progress(message.replace(/^Reading page/, 'PDF page').replace(/^Scanning page/, 'Scan page')));
      raw = cleanPdfText(reading.text); scanned = reading.method === 'ocr'; pages = reading.pages;
    } catch (error) {
      throw new TranscriptFileError(error instanceof Error ? `PDF नहीं पढ़ी जा सकी: ${error.message}` : 'PDF नहीं पढ़ी जा सकी।');
    }
  } else if (kind === 'office') {
    progress('Document पढ़ रहा हूँ…');
    const { extractLocally } = await import('./file-extract');
    try { raw = (await extractLocally(file)) ?? ''; }
    catch { throw new TranscriptFileError('Document खोला नहीं जा सका। DOCX को फिर से save करके लगाएँ।'); }
  } else {
    raw = (await file.text()).replace(/^\uFEFF/, '');
    if (kind === 'markdown') raw = markdownToTranscript(raw);
  }
  raw = raw.trim();
  if (!raw) throw new TranscriptFileError('इस file में पढ़ने लायक text नहीं मिला।');
  const limited = limitTranscript(raw);
  return { kind: 'text', text: limited.text, truncated: limited.truncated, scanned, ...(pages ? { pages } : {}) };
}
