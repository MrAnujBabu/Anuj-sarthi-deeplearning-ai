import { describe, expect, it } from 'vitest';
import { isStudioImagePath } from '@/lib/studio.server';

describe('Finished picture copy after refresh', () => {
  it('serves a picture made within the last 24 hours', () => {
    expect(isStudioImagePath(`images/${Date.now() - 23 * 3600_000}-123e4567-e89b-12d3-a456-426614174000.jpg`)).toBe(true);
  });
  it('stops serving it after 24 hours', () => {
    expect(isStudioImagePath(`images/${Date.now() - 25 * 3600_000}-123e4567-e89b-12d3-a456-426614174000.jpg`)).toBe(false);
  });
  it('rejects paths outside the picture folder', () => {
    expect(isStudioImagePath(`topaz/${Date.now()}-123e4567-e89b-12d3-a456-426614174000.mp4`)).toBe(false);
  });
});
