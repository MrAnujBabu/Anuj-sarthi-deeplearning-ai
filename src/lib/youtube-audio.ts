import { createParser } from 'eventsource-parser';
import { decodePCM, SPEECH_SAMPLE_RATE } from './stream-speech';
import { fetchHindiSpeech, speechState, SARVAM_RETRY_MS, type YouTubeVoiceEngine } from './youtube-speech';
import type { SarvamVoice } from './sarvam-speech';

/** Buffered consumers can retry once with Lovable after a broken Sarvam 200 stream.
 * No audio has played yet, so fallback cannot duplicate audible speech. */
export async function fetchDubAudio(text: string, voice: SarvamVoice, ctx: AudioContext, signal: AbortSignal, engine?: YouTubeVoiceEngine) {
  const sarvamAttempt = engine !== 'lovable' && !speechState.forceBackup
    && (!speechState.useBackup || Date.now() >= speechState.backupUntil);
  const response = await fetchHindiSpeech(text, voice, signal, Date.now(), engine);
  try { return await readDubAudio(response, ctx, signal); }
  catch (error) {
    if (signal.aborted || !sarvamAttempt || speechState.useBackup) throw error;
    speechState.useBackup = true; speechState.backupUntil = Date.now() + SARVAM_RETRY_MS;
    return readDubAudio(await fetchHindiSpeech(text, voice, signal, Date.now(), 'lovable'), ctx, signal);
  }
}

export async function readDubAudio(response: Response, ctx: AudioContext, signal: AbortSignal) {
  if (!response.body) throw new Error('No audio.');
  const chunks: Float32Array[] = [];
  let pending: Uint8Array = new Uint8Array(0), completed = false;
  const parser = createParser({ onEvent: event => {
    const d = JSON.parse(event.data) as { type: string; audio?: string; error?: string };
    if (d.type === 'error' || d.error) throw new Error(d.error || 'Speech failed.');
    if (d.type === 'speech.audio.done') { completed = true; return; }
    if (d.type !== 'speech.audio.delta') return;
    if (completed || !d.audio) throw new Error('Invalid audio stream.');
    const out = decodePCM(pending, Uint8Array.from(atob(d.audio), c => c.charCodeAt(0)));
    pending = out.pending; chunks.push(out.samples);
  } });
  const reader = response.body.getReader(), decoder = new TextDecoder();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    parser.feed(decoder.decode()); parser.reset({ consume: true });
    signal.throwIfAborted();
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    if (!completed || !total || pending.length) throw new Error('Incomplete Hindi audio. Please try again.');
    const buffer = ctx.createBuffer(1, total, SPEECH_SAMPLE_RATE);
    let offset = 0;
    for (const chunk of chunks) { buffer.copyToChannel(chunk as Float32Array<ArrayBuffer>, 0, offset); offset += chunk.length; }
    return buffer;
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {}); reader.releaseLock();
  }
}