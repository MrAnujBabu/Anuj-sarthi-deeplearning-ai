import { expect, it, vi } from 'vitest';
import { LiveSpeechQueue, takeSpeechThoughts } from '@/lib/live-speech-queue';

it('starts complete thoughts immediately and preserves the unfinished next thought', () => {
  expect(takeSpeechThoughts('Haan. Cell energy banata hai। Agla shab')).toEqual({ thoughts: ['Haan.', 'Cell energy banata hai।'], remainder: ' Agla shab' });
  expect(takeSpeechThoughts('Value 1.5 hai')).toEqual({ thoughts: [], remainder: 'Value 1.5 hai' });
});
it('limits paid requests to the active sentence and one look-ahead, playing in order', async () => {
  const finish: Array<() => void> = [];
  const request = vi.fn(async () => new Response('audio'));
  const play = vi.fn(() => new Promise<void>(resolve => finish.push(resolve)));
  const busy = vi.fn();
  const queue = new LiveSpeechQueue({ request, play, busy, error: vi.fn() });
  queue.enqueue('one'); queue.enqueue('two'); queue.enqueue('three');
  expect(request).toHaveBeenCalledTimes(2);
  expect(play.mock.calls).toHaveLength(1);
  finish[0]?.(); await new Promise(resolve => setTimeout(resolve, 0));
  expect(request).toHaveBeenCalledTimes(3);
  expect(play.mock.calls).toHaveLength(2);
  finish[1]?.(); await new Promise(resolve => setTimeout(resolve, 0));
  finish[2]?.(); await new Promise(resolve => setTimeout(resolve, 0));
  expect(busy).toHaveBeenLastCalledWith(false);
});
it('cancelled old playback cannot reopen the mic during a new reply', async () => {
  let finish: (() => void) | undefined;
  const busy = vi.fn();
  const queue = new LiveSpeechQueue({ request: async () => new Response(''), play: () => new Promise<void>(r => { finish = r; }), busy, error: vi.fn() });
  queue.enqueue('old'); queue.cancel(); busy(true);
  finish?.(); await new Promise(resolve => setTimeout(resolve, 0));
  expect(busy).toHaveBeenLastCalledWith(true);
});
it('a speech denial stops queued work and surfaces the actual error once', async () => {
  const error = vi.fn(); const denial = new Error('Voice access denied');
  const request = vi.fn(async () => new Response(''));
  const queue = new LiveSpeechQueue({ request, play: async () => { throw denial; }, busy: vi.fn(), error });
  queue.enqueue('one'); queue.enqueue('two'); queue.enqueue('three');
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(error).toHaveBeenCalledExactlyOnceWith(denial);
  expect(request).toHaveBeenCalledTimes(2);
  queue.enqueue('four'); expect(request).toHaveBeenCalledTimes(2);
});it('thoughts that arrive while speaking are sent as one merged request', async () => {
  const finish: Array<() => void> = [];
  const request = vi.fn(async (_text: string) => new Response('audio'));
  const play = vi.fn(() => new Promise<void>(resolve => finish.push(resolve)));
  const queue = new LiveSpeechQueue({ request, play, busy: vi.fn(), error: vi.fn() });
  queue.enqueue('one'); queue.enqueue('two');
  queue.enqueue('three.'); queue.enqueue('four.'); queue.enqueue('five.');
  finish[0]?.(); await new Promise(resolve => setTimeout(resolve, 0));
  expect(request).toHaveBeenCalledTimes(3);
  expect(request.mock.calls[2]?.[0]).toBe('three. four. five.');
});
