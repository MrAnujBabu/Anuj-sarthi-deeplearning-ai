import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { isSavedYouTubeStudy, loadYouTubeStudy, saveYouTubeStudy, libraryKey, type SavedYouTubeStudy } from '@/lib/youtube-study-store';

it('keeps distinct conversions of the same video in separate library entries', () => {
  expect(libraryKey({ title: 'T', videoId: 'Lt54CX9DmS4', sourceKey: 'reviewed' }, '', '')).
    not.toBe(libraryKey({ title: 'T', videoId: 'Lt54CX9DmS4', sourceKey: 'fast' }, '', ''));
});

it('restores completed transcript, timestamps, URL and voice from device storage', async () => {
  const study: SavedYouTubeStudy = { version: 1, url: 'https://youtu.be/KA5kPbdkK2E', transcript: '', voice: 'ishita_hi_edtech',
    result: { title: 'Lecture', hindi: 'पहला। दूसरा।', truncated: false, videoId: 'KA5kPbdkK2E', dub: [{ start: 0, end: 30, hindi: 'पहला।' }, { start: 30, end: 60, hindi: 'दूसरा।' }] } };
  await saveYouTubeStudy(study);
  expect(await loadYouTubeStudy()).toEqual(study);
});
it('rejects corrupt stored timestamps and unknown voices', () => {
  expect(isSavedYouTubeStudy({ version: 1, voice: 'fake', url: '', transcript: '', result: {} })).toBe(false);
  expect(isSavedYouTubeStudy({ version: 1, voice: 'ishita_hi_edtech', url: '', transcript: '', result: { title: '', hindi: 'a', truncated: false, dub: [{ start: 30, end: 1, hindi: 'a' }] } })).toBe(false);
});