import { describe, expect, it } from 'vitest';
import { reduceEvent, liveDub, IDLE_STATE } from '@/lib/interpret-client';

describe('streamed interpretation state', () => {
  const timeline = [{ start: 0, end: 30, text: 'Hello' }, { start: 30, end: 60, text: 'World' }];
  const withSource = reduceEvent(IDLE_STATE, { type: 'source', title: 'T', language: 'en', origin: 'captions', segments: 2, duration: 60, truncated: false, videoId: 'abc', timeline });

  it('fills each Hindi part as it arrives, so voice can start before the end', () => {
    const s = reduceEvent(withSource, { type: 'segment', index: 1, start: 30, end: 60, hindi: 'दुनिया', original: 'World' });
    expect(liveDub(s)).toEqual([{ start: 0, end: 30, hindi: '' }, { start: 30, end: 60, hindi: 'दुनिया' }]);
  });

  it('ignores out-of-range parts', () => {
    const s = reduceEvent(withSource, { type: 'segment', index: 5, start: 0, end: 1, hindi: 'x', original: 'x' });
    expect(s.hindi).toEqual(['', '']);
  });
});
