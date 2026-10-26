import { isAiCancellation } from './ai/cancellation';

export const SARVAM_VOICE = 'shubh_hi_customer';
export const SARVAM_VOICE_LABEL = 'Sarvam · Shubh · Friendly';
export const SARVAM_SPEECH_MODEL = 'bulbul:v4-flash';
/** Slightly brisk teacher pace (1 = Sarvam default). */
export const SARVAM_PACE = 1.35;

// Curated Hindi conversational/teaching personas, not the full multilingual catalog.
// Official catalog: https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/voices
export const SARVAM_VOICES = [
  'shubh_hi_customer', 'ratan_hi_customer_expressive', 'aayan_hi_conversational',
  'kabir_hi_conversational', 'sumit_hi_conversational', 'kavya_hi_conversational',
  'ishita_hi_edtech', 'simran_hi_conversation', 'aparna_hi_customer',
] as const;
export type SarvamVoice = typeof SARVAM_VOICES[number];
export const SARVAM_VOICE_KEY = 'snapsolve.sarvam-voice';
const LEGACY_VOICES: Record<string, SarvamVoice> = {
  shubh: 'shubh_hi_customer', ratan: 'ratan_hi_customer_expressive',
  aayan: 'aayan_hi_conversational', kabir: 'kabir_hi_conversational',
  sumit: 'sumit_hi_conversational', kavya: 'kavya_hi_conversational',
  ishita: 'ishita_hi_edtech', simran: 'simran_hi_conversation',
};
const VOICE_LABELS: Record<SarvamVoice, string> = {
  shubh_hi_customer: 'Shubh · Friendly', ratan_hi_customer_expressive: 'Ratan · Expressive',
  aayan_hi_conversational: 'Aayan · Conversational', kabir_hi_conversational: 'Kabir · Conversational',
  sumit_hi_conversational: 'Sumit · Conversational', kavya_hi_conversational: 'Kavya · Conversational',
  ishita_hi_edtech: 'Ishita · Teacher', simran_hi_conversation: 'Simran · Conversational',
  aparna_hi_customer: 'Aparna · Friendly',
};

export function isSarvamVoice(value: unknown): value is SarvamVoice {
  return typeof value === 'string' && SARVAM_VOICES.some(voice => voice === value);
}

export function sarvamVoiceLabel(voice: SarvamVoice) {
  return `Sarvam · ${VOICE_LABELS[voice]}`;
}

/** Migrate only device preferences; the API accepts exact current persona IDs. */
export function resolveSarvamVoice(value: unknown): SarvamVoice {
  if (isSarvamVoice(value)) return value;
  if (typeof value === 'string' && Object.hasOwn(LEGACY_VOICES, value)) return LEGACY_VOICES[value] ?? SARVAM_VOICE;
  return SARVAM_VOICE;
}

export function sarvamSpeechRequest(text: string, speaker: SarvamVoice = SARVAM_VOICE) {
  return { text, language_code: 'hi-IN', model: SARVAM_SPEECH_MODEL,
    speaker, speech_sample_rate: 24000, output_audio_codec: 'linear16', pace: SARVAM_PACE };
}

/** When a Sarvam voice fails mid-call (credits/access), the call keeps talking through this Gemini voice. */
export function sarvamFallback<T>(failedVoice: unknown, geminiVoice: T | null): T | null {
  return isSarvamVoice(failedVoice) ? geminiVoice : null;
}

export function sarvamAudioEvents(audios: string[]) {
  return audios.map(audio => `data: ${JSON.stringify({ type: 'speech.audio.delta', audio })}\n\n`).join('')
    + `data: ${JSON.stringify({ type: 'speech.audio.done' })}\n\n`;
}
/** Sarvam refuses text holding no letter or digit (emoji, dashes, dots) — reading it would only burn a request. */
export function isSpeakableSarvamText(text: string) {
  return /[\p{L}\p{N}]/u.test(text);
}
/** Tells the speech queue this chunk has nothing to read, so it moves on without switching voices. */
export function sarvamSkippedEvents() {
  return `data: ${JSON.stringify({ type: 'speech.audio.skipped' })}\n\n`;
}
/** Sarvam's streaming endpoint starts sending audio ~0.5 s sooner than the full-response endpoint. */
export const SARVAM_STREAM_URL = 'https://api.sarvam.ai/text-to-speech/stream';
/** ~200 ms of 24 kHz 16-bit audio: starts fast while keeping playback pieces smooth. */
export const SARVAM_MIN_CHUNK_BYTES = 9600;

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Re-emits Sarvam's raw PCM stream as the app's speech events while it is still arriving. */
export function sarvamStreamEvents(pcm: ReadableStream<Uint8Array>, minChunk = SARVAM_MIN_CHUNK_BYTES): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const event = (payload: object) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  const reader = pcm.getReader();
  let held = new Uint8Array(0);
  let sent = 0;
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        let next: ReadableStreamReadResult<Uint8Array>;
        try { next = await reader.read(); } catch (error) {
          // Student stopped/interrupted speech: the upstream read aborts. End quietly instead of crashing.
          if (cancelled || isAiCancellation(error)) { try { controller.close(); } catch { /* already closed */ } return; }
          try { controller.enqueue(event({ type: 'error', error: 'Sarvam audio stream broke.' })); controller.close(); } catch { /* client gone */ }
          return;
        }
        if (cancelled) return;
        if (next.done) {
          if (held.length) { controller.enqueue(event({ type: 'speech.audio.delta', audio: toBase64(held) })); sent += held.length; held = new Uint8Array(0); }
          controller.enqueue(sent ? event({ type: 'speech.audio.done' }) : event({ type: 'error', error: 'Sarvam returned no audio.' }));
          controller.close();
          return;
        }
        const merged = new Uint8Array(held.length + next.value.length);
        merged.set(held); merged.set(next.value, held.length);
        // Send only whole 16-bit samples; the odd byte waits for the next piece.
        const ready = merged.length - (merged.length % 2);
        if (ready >= minChunk) {
          controller.enqueue(event({ type: 'speech.audio.delta', audio: toBase64(merged.subarray(0, ready)) }));
          sent += ready;
          held = merged.slice(ready);
          return;
        }
        held = merged;
      }
    },
    async cancel(reason) {
      cancelled = true;
      held = new Uint8Array(0);
      // A disconnected client cannot receive another error; observe cleanup rejection
      // here so the provider's AbortError never becomes an unhandled rejection.
      try { await reader.cancel(reason); } catch { /* upstream already aborted/closed */ }
    },
  });
}
