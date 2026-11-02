import { describe, expect, it } from 'vitest';
import { parseChannelInput } from '@/lib/youtube-channel';
describe('playlist links', () => {
  it('reads a playlist link', () => expect(parseChannelInput('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')).toEqual({ kind: 'playlist', id: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf' }));
  it('reads list from a watch link', () => expect(parseChannelInput('https://youtube.com/watch?v=abcdefghijk&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')?.kind).toBe('playlist'));
  it('keeps channel handles working', () => expect(parseChannelInput('@hubermanlab')?.kind).toBe('url'));
});
