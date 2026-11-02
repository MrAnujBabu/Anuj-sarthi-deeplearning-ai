// Pure helpers: what the council checks for a given assistant message.
import type { UIMessage } from 'ai';
import { isResumeText } from '@/lib/chat-resume';

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('\n').trim();

/** The student's question (nearest earlier non-resume user turn) and its photos for one answer. */
export function councilInputFor(messages: UIMessage[], index: number): { question: string; images: string[] } {
  for (let i = index - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'user') continue;
    const text = textOf(m);
    if (isResumeText(text)) continue;
    const images = m.parts
      .filter((p): p is Extract<typeof p, { type: 'file' }> => p.type === 'file' && !!p.mediaType?.startsWith('image/') && p.url.startsWith('data:image/'))
      .map((p) => p.url)
      .slice(0, 2);
    return { question: text || 'Solve the question in the attached photo.', images };
  }
  return { question: '', images: [] };
}

/** The full answer text, including any continuation turns after a pause/resume. */
export function answerTextFor(messages: UIMessage[], index: number): string {
  const m = messages[index];
  return m ? textOf(m) : '';
}

/** Auto-check only substantial answers (skip one-line acknowledgements). */
export function isWorthChecking(answer: string) {
  return answer.replace(/\s+/g, ' ').trim().length >= 160;
}
