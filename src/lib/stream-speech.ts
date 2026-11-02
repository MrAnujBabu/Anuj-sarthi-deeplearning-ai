import { createParser } from "eventsource-parser";
import { speechChoice } from "./voice-style";

export function decodePCM(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, pending: bytes.slice(usable) };
}

/**
 * Reads a body into memory as it arrives, so a look-ahead stream never sits idle
 * (idle streams were cut by proxies/mobile networks mid-call: "Error in input stream").
 */
export function bufferResponse(response: Response): Response {
  if (!response.ok || !response.body) return response;
  const reader = response.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        try {
          for (;;) {
            const next = await reader.read();
            if (next.done) break;
            controller.enqueue(next.value);
          }
          controller.close();
        } catch (error) {
          try { controller.error(error); } catch { /* already cancelled */ }
        }
      })();
    },
    cancel(reason) { return reader.cancel(reason); },
  });
  return new Response(stream, { status: response.status, headers: response.headers });
}

/** Starts the speech request now so its audio is ready when the previous sentence ends. */
export function prefetchSpeech(endpoint: string, text: string, signal: AbortSignal, voice: string): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
    signal,
  }).then(bufferResponse);
}

/**
 * Busy (429), server (5xx) and network/stream failures are retried; refusals such
 * as credits (402) or access (403) and provider error events are not.
 */
export function retryableSpeechError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/^TTS failed: (429|5\d\d)/.test(message)) return true;
  return !/^TTS failed: \d|Speech failed:/.test(message);
}
/** Credits (402) and access (403) refusals end a voice for the whole call; a refusal to read one fragment does not. */
export function speechAccessFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /^TTS failed: (402|403)/.test(message);
}

/** Audio cushion before playback starts or resumes after a gap. */
export const SPEECH_JITTER_LEAD_S = 0.2;
/** Cushion when a sentence directly follows the previous one (its audio is already prefetched). */
export const SPEECH_FOLLOW_LEAD_S = 0.03;
/** Speech audio is 24 kHz; a speaker at the same rate joins pieces without resampling clicks. */
export const SPEECH_SAMPLE_RATE = 24000;
const lastEnd = new WeakMap<BaseAudioContext, number>();

/** Where the next piece starts: right after the audio before it, or after a cushion when playback ran dry. */
export function nextStartTime(playhead: number, now: number, previousEnd: number | undefined) {
  if (playhead >= now + 0.02) return playhead;
  if (playhead === 0 && previousEnd !== undefined && now - previousEnd < 0.3) return now + SPEECH_FOLLOW_LEAD_S;
  return now + SPEECH_JITTER_LEAD_S;
}

/** Waits before each retry; the shared speech service often frees up within seconds. */
export const SPEECH_RETRY_DELAYS_MS = [700, 1800, 3500];

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason ?? new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}

/**
 * Plays one sentence; if it breaks before any audio was heard, asks again after a
 * short wait. A shared AudioContext keeps one speaker open for the whole call.
 */
export async function speakSentence(endpoint: string, text: string, signal: AbortSignal, voice: string, ready?: Promise<Response>, context?: AudioContext) {
  let heard = false;
  let attempt: Promise<Response> | undefined = ready;
  for (let retry = 0; ; retry++) {
    try {
      await streamSpeech(endpoint, text, signal, voice, attempt, () => { heard = true; }, context);
      return;
    } catch (error) {
      const delay = SPEECH_RETRY_DELAYS_MS[retry];
      if (signal.aborted || heard || delay === undefined || !retryableSpeechError(error)) throw error;
      await wait(delay, signal);
      attempt = prefetchSpeech(endpoint, text, signal, voice);
    }
  }
}

export async function streamSpeech(endpoint: string, text: string, signal?: AbortSignal, voice?: string, prefetched?: Promise<Response>, onFirstAudio?: () => void, shared?: AudioContext): Promise<void> {
  signal?.throwIfAborted();
  let selected = speechChoice(undefined);
  try { selected = speechChoice(localStorage.getItem('snapsolve.voice-choice')); } catch { /* Keep default. */ }
  const context = shared && shared.state !== "closed" ? shared : new AudioContext({ sampleRate: SPEECH_SAMPLE_RATE });
  const owned = context !== shared;
  const sources = new Set<AudioBufferSourceNode>();
  let playhead = 0;
  let pending = new Uint8Array(0);
  let completed = false;
  let skipped = false;
  let samplesPlayed = 0;
  // Guard against rare runaway generations (long silence/babble): normal speech is ~0.1 s per character.
  const maxSamples = Math.round((4 + text.length * 0.25) * 24000);
  let capped = false;
  let reader: ReadableStreamDefaultReader<string> | undefined;
  const controller = new AbortController();
  const abort = () => {
    controller.abort(signal?.reason);
    void reader?.cancel().catch(() => {});
    for (const source of sources) source.stop();
  };
  signal?.addEventListener("abort", abort, { once: true });
  let playback: Promise<void> = Promise.resolve();
  try {
    if (context.state === "suspended") await context.resume();
    const response = prefetched ? await prefetched : await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: voice ?? selected.voice, style: voice ? "teacher" : selected.style }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error(`TTS failed: ${response.status} ${await response.text()}`);
    const parser = createParser({
      onEvent(event) {
        const payload = JSON.parse(event.data) as { type: string; audio?: string; error?: unknown };
        if (payload.type === "error" || payload.error) throw new Error(`Speech failed: ${event.data}`);
        if (payload.type === "speech.audio.done") {
          completed = true;
          return;
        }
        if (payload.type === "speech.audio.skipped") {
          completed = true;
          skipped = true;
          return;
        }
        if (payload.type !== "speech.audio.delta" || capped) return;
        if (completed || !payload.audio) throw new Error("Invalid speech audio event");
        const decoded = decodePCM(
          pending,
          Uint8Array.from(atob(payload.audio), (c) => c.charCodeAt(0)),
        );
        pending = new Uint8Array(decoded.pending);
        if (!decoded.samples.length) return;
        if (samplesPlayed === 0) onFirstAudio?.();
        samplesPlayed += decoded.samples.length;
        if (samplesPlayed > maxSamples) { capped = true; return; }
        const buffer = context.createBuffer(1, decoded.samples.length, 24000);
        buffer.copyToChannel(decoded.samples, 0);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        sources.add(source);
        playback = new Promise<void>((resolve) => {
          source.onended = () => {
            sources.delete(source);
            resolve();
          };
        });
        // Start (or restart after a network hiccup) with a small cushion so late
        // pieces join smoothly instead of leaving audible gaps.
        playhead = nextStartTime(playhead, context.currentTime, lastEnd.get(context));
        source.start(playhead);
        playhead += buffer.duration;
        lastEnd.set(context, playhead);
      },
    });
    reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        parser.feed(next.value);
        if (capped) { await reader.cancel().catch(() => {}); break; }
      }
      parser.reset({ consume: true });
    } finally {
      reader.releaseLock();
    }
    // A runaway generation is cut at the limit; the sentence ends and the next one plays.
    if (capped) console.warn("[speech] runaway audio cut at safety limit");
    if (!capped && (!completed || (!skipped && (!samplesPlayed || pending.length)))) throw new Error("Incomplete speech stream");
    await playback;
    signal?.throwIfAborted();
  } finally {
    signal?.removeEventListener("abort", abort);
    controller.abort();
    for (const source of sources) source.stop();
    if (owned) await context.close();
  }
}
