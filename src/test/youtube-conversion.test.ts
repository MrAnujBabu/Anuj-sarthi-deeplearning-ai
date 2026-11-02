import { expect, it } from 'vitest';
import { assembleHindiDub } from '@/lib/youtube-conversion';

it('reuses all ordered Hindi segments without changing their timestamps', () => {
  const result = assembleHindiDub([{ start: 1, end: 22, text: 'a' }, { start: 40, end: 45, text: 'b' }], ['पहला।', 'दूसरा।']);
  expect(result).toEqual({ hindi: 'पहला।\n\nदूसरा।', dub: [{ start: 1, end: 22, hindi: 'पहला।' }, { start: 40, end: 45, hindi: 'दूसरा।' }] });
});
it('rejects missing translated parts instead of silently skipping lecture content', () => {
  expect(() => assembleHindiDub([{ start: 0, end: 20, text: 'fact' }], [])).toThrow('incomplete');
  expect(() => assembleHindiDub([{ start: 0, end: 20, text: 'fact' }], [' '])).toThrow('incomplete');
});