import { afterEach, expect, it, vi } from 'vitest';
import { streamSpeech, decodePCM, bufferResponse, speakSentence, retryableSpeechError } from '@/lib/stream-speech';
afterEach(() => vi.unstubAllGlobals());

it('preserves PCM samples split across SSE byte boundaries', () => {
  const first = decodePCM(new Uint8Array(), new Uint8Array([0, 64, 0]));
  expect(Array.from(first.samples)).toEqual([0.5]);
  expect(Array.from(decodePCM(first.pending, new Uint8Array([192])).samples)).toEqual([-0.5]);
});
it('Stop cancels a prefetched body while waiting for the next audio event', async () => {
  const cancel = vi.fn(); const close = vi.fn(async () => {});
  vi.stubGlobal('AudioContext', class { state = 'running'; close = close; });
  const body = new ReadableStream({ cancel });
  const controller = new AbortController();
  const playback = streamSpeech('/api/speech', 'Hello', controller.signal, 'Kore', Promise.resolve(new Response(body)));
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.abort();
  await expect(playback).rejects.toThrow();
  expect(cancel).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
});
it('look-ahead bodies are read eagerly so they never sit idle', async () => {
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>({ pull(c) { pulls++; if (pulls > 3) c.close(); else c.enqueue(new Uint8Array([pulls])); } }, { highWaterMark: 0 });
  bufferResponse(new Response(body));
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(pulls).toBe(4);
});

it('a busy or broken sentence is retried with backoff, at most three times, before any audio', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('AudioContext', class { state = 'running'; currentTime = 0; destination = {}; close = async () => {}; });
  const busy = () => new Response('{"error":"busy"}', { status: 429 });
  const fetchMock = vi.fn(async () => busy());
  vi.stubGlobal('fetch', fetchMock);
  const done = speakSentence('/api/speech', 'Hello', new AbortController().signal, 'Kore', Promise.resolve(busy())).catch(e => e);
  await vi.advanceTimersByTimeAsync(699);
  expect(fetchMock).toHaveBeenCalledTimes(0);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(await done).toBeInstanceOf(Error);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  vi.useRealTimers();
});

it('credit and access refusals are never retried; busy and network failures are', () => {
  expect(retryableSpeechError(new Error('TTS failed: 402 {}'))).toBe(false);
  expect(retryableSpeechError(new Error('TTS failed: 403 {}'))).toBe(false);
  expect(retryableSpeechError(new Error('TTS failed: 429 {}'))).toBe(true);
  expect(retryableSpeechError(new Error('TTS failed: 503 {}'))).toBe(true);
  expect(retryableSpeechError(new TypeError('network error'))).toBe(true);
});
