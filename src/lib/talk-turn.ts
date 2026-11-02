import { createParser } from 'eventsource-parser';

export type TalkMessage = { id: string; role: 'user' | 'assistant'; text: string };

/** Live calls run everywhere: Vercel pages connect to this project's published relay. Talk turns stay as a manual fallback only. */
export function usesTalkTurns(_origin: string) {
  return false;
}

export function toUIMessages(history: TalkMessage[]) {
  return history.map(m => ({ id: m.id, role: m.role, parts: [{ type: 'text', text: m.text }] }));
}

/** Keep spoken answers short; drop hidden tags and markdown that sound bad aloud. */
export function speakableText(text: string) {
  return text.replace(/```[\s\S]*?(```|$)/g, ' ').replace(/<[^>]+>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/\$+/g, ' ').replace(/[#*_`>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
}

/** Read the tutor's streamed answer from /api/chat and report text as it arrives. */
export async function readTutorAnswer(response: Response, onText: (text: string) => void) {
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body.trim().slice(0, 300) || `The tutor could not answer (${response.status}).`);
  }
  if (!response.body) throw new Error('No answer received.');
  let text = '', failure: Error | undefined;
  const parser = createParser({ onEvent(event) {
    if (event.data === '[DONE]') return;
    let value: { type?: string; delta?: string; errorText?: string };
    try { value = JSON.parse(event.data); } catch { return; }
    if (value.type === 'text-delta' && value.delta) { text += value.delta; onText(text); }
    else if (value.type === 'error') failure = new Error(value.errorText || 'The tutor stopped.');
  } });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value, { stream: true }));
    if (failure) throw failure;
  }
  parser.feed(decoder.decode());
  if (failure) throw failure;
  return text.trim();
}
