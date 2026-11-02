// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { earlyFallback } from '@/lib/agent/fallback';

const delay = (ms: number, v?: unknown) => new Promise((r) => setTimeout(() => r(v), ms));
const ok = (v: any) => !!v?.text;

describe('earlyFallback (slow provider never blocks the answer)', () => {
  it('fast usable primary wins and the fallback is never started', async () => {
    let fallbackStarted = false;
    const r = await earlyFallback(Promise.resolve({ text: 'primary' }), async () => { fallbackStarted = true; return { text: 'fallback' }; }, 200, ok);
    expect(r).toEqual({ text: 'primary' });
    expect(fallbackStarted).toBe(false);
  });

  it('fast unusable primary still falls back (same as the sequential path)', async () => {
    const r = await earlyFallback(Promise.resolve({ text: '' }), async () => ({ text: 'fallback' }), 200, ok);
    expect(r).toEqual({ text: 'fallback' });
  });

  it('fast-failing primary falls back', async () => {
    const r = await earlyFallback(Promise.reject(new Error('down')), async () => ({ text: 'fallback' }), 200, ok);
    expect(r).toEqual({ text: 'fallback' });
  });

  it('slow primary → fallback starts early and the first usable answer wins', async () => {
    const t0 = Date.now();
    const r = await earlyFallback(delay(400, { text: 'primary' }), async () => ({ text: 'fallback' }), 60, ok);
    expect(r).toEqual({ text: 'fallback' });
    expect(Date.now() - t0).toBeLessThan(350);
  });

  it('both unusable but primary fulfils → returns the primary value', async () => {
    const r = await earlyFallback(delay(120, { text: '' }), async () => ({ text: '' }), 60, ok);
    expect(r).toEqual({ text: '' });
  });

  it('both fail fast → the fallback rejection surfaces', async () => {
    await expect(earlyFallback(Promise.reject(new Error('primary down')), async () => { throw new Error('fallback down'); }, 60, ok))
      .rejects.toThrow('fallback down');
  });

  it('both fail slowly → the primary rejection surfaces', async () => {
    const primary = delay(120).then(() => { throw new Error('primary down'); });
    await expect(earlyFallback(primary, async () => { throw new Error('fallback down'); }, 60, ok))
      .rejects.toThrow('primary down');
  });
});
