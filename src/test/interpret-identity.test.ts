import { expect, it } from 'vitest';
import { interpretationIdentity, matchingResume } from '@/lib/interpret-identity';
import { checkpointKey } from '@/lib/interpret-checkpoint';

it('rejects equal-count saved Hindi when source text or timings change', async () => {
  const segments = [{ start: 0, end: 30, text: 'There are two examples.' }];
  const key = await interpretationIdentity(segments, 'en', 'video', 'claude', true, false);
  const changed = await interpretationIdentity([{ ...segments[0], start: 0, end: 30, text: 'There are three examples.' }], 'en', 'video', 'claude', true, false);
  const shifted = await interpretationIdentity([{ start: 1, end: 31, text: 'There are two examples.' }], 'en', 'video', 'claude', true, false);
  const saved = { sourceKey: key, lines: ['दो examples हैं।'] };
  expect(matchingResume(saved, 1, key)?.lines).toEqual(saved.lines);
  expect(matchingResume(saved, 1, changed)).toBeNull();
  expect(matchingResume(saved, 1, shifted)).toBeNull();
  expect(matchingResume({ lines: saved.lines }, 1, key)).toBeNull();
});

it('separates deep listening from caption checkpoints', () => {
  const input = { kind: 'link' as const, url: 'https://www.youtube.com/watch?v=Lt54CX9DmS4' };
  expect(checkpointKey(input, 'claude', true, true)).not.toBe(checkpointKey(input, 'claude', true, false));
});