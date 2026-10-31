import { expect, it, vi } from 'vitest';
import { readDubAudio, fetchDubAudio } from '@/lib/youtube-audio';
import { speechState } from '@/lib/youtube-speech';

it('falls back once when Sarvam returns HTTP 200 but its audio stream is incomplete', async () => {
  speechState.useBackup = false; speechState.forceBackup = false;
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('data: {"type":"speech.audio.delta","audio":"AAA="}\n\n'))
    .mockResolvedValueOnce(new Response('data: {"type":"speech.audio.delta","audio":"AAA="}\n\ndata: {"type":"speech.audio.done"}\n\n'));
  vi.stubGlobal('fetch', fetcher);
  try {
    await fetchDubAudio('नमस्ते।', 'ishita_hi_edtech', context, new AbortController().signal, 'sarvam');
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/api/sarvam-speech', '/api/speech']);
  } finally { vi.unstubAllGlobals(); speechState.useBackup = false; }
});

const context = { createBuffer: vi.fn(() => ({ copyToChannel: vi.fn() })) } as unknown as AudioContext;
it('rejects truncated speech instead of playing incomplete narration', async () => {
  await expect(readDubAudio(new Response('data: {"type":"speech.audio.delta","audio":"AAA="}\n\n'), context, new AbortController().signal)).rejects.toThrow('Incomplete');
});
it('cancels a stalled audio reader on Stop', async () => {
  const cancel = vi.fn(), ctl = new AbortController();
  const response = new Response(new ReadableStream({ cancel }));
  const result = readDubAudio(response, context, ctl.signal);
  ctl.abort();
  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  expect(cancel).toHaveBeenCalledOnce();
});