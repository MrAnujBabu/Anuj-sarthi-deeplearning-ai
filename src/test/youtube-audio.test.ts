import { expect, it, vi } from 'vitest';
import { readDubAudio } from '@/lib/youtube-audio';

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