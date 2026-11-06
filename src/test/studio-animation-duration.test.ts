import { describe, expect, it } from 'vitest';
import { ANIMATION_DURATIONS, isAnimationDuration } from '@/lib/studio-tools';

describe('Concept Animation duration', () => {
  it('accepts the requested 30-second generation', () => {
    expect(ANIMATION_DURATIONS).toContain(30);
    expect(isAnimationDuration(30)).toBe(true);
  });
  it('does not submit an unsupported 60-second single generation', () => {
    expect(isAnimationDuration(60)).toBe(false);
  });
});