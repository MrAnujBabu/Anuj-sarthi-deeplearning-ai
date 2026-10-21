import { createParser } from 'eventsource-parser';
import { cleanTranscript } from '@/lib/noise-filter';

/** Consume split SSE frames without buffering the visible transcript. */
export async function readTranscript(response: Response, onText: (text: string) => void) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Voice typing failed (${response.status}).`);
  }
  if (!response.body) throw new Error('No transcription stream received.');
  let text = '', complete = false, failure: Error | undefined;
  const parser = createParser({ onEvent(event) {
    if (event.data === '[DONE]') return;
    let value: { type?: string; delta?: string; text?: string; error?: { message?: string }; message?: string };
    try { value = JSON.parse(event.data); } catch { return; }
    if (value.type === 'error' || value.error) {
      failure = new Error(value.error?.message || value.message || 'Transcription stopped.');
    } else if (value.type === 'transcript.text.delta') {
      text += value.delta || '';
      onText(cleanTranscript(text));
    } else if (value.type === 'transcript.text.done') {
      text = value.text ?? text;
      complete = true;
      onText(cleanTranscript(text));
    }
  } });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
      if (failure) throw failure;
    }
    parser.feed(decoder.decode());
    if (failure) throw failure;
    if (!complete) throw new Error('Voice typing was interrupted. Partial text is kept; check it before sending.');
    text = cleanTranscript(text);
    if (!text.trim()) throw new Error('Kuch samajh nahi aaya — dobara bolo.');
    return text.trim();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}