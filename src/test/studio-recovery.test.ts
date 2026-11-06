import { describe, expect, it, vi, afterEach } from 'vitest';
import { beginStudioRequest, endStudioRequest, deferStudio, responseWaitSeconds, studioRemaining, studioWaitSeconds } from '@/lib/studio-recovery';

afterEach(() => { endStudioRequest(); vi.useRealTimers(); });

describe('Studio rate-limit recovery', () => {
  it('converts SDK milliseconds without shortening the provider wait', () => {
    expect(studioWaitSeconds(90500)).toBe(91);
    expect(studioWaitSeconds()).toBe(60);
  });
  it('accepts Retry-After seconds and dates', () => {
    expect(responseWaitSeconds(new Response(null, { headers: { 'Retry-After': '120' } }))).toBe(120);
    expect(responseWaitSeconds(new Response(null, { headers: { 'Retry-After': 'Fri, 06 Nov 2026 13:02:00 GMT' } }), Date.parse('2026-11-06T13:00:00Z'))).toBe(120);
  });
  it('blocks repeated submissions until cooldown ends', () => {
    vi.useFakeTimers();
    deferStudio(60);
    expect(studioRemaining()).toBe(60);
    expect(() => beginStudioRequest()).toThrow();
    vi.advanceTimersByTime(60000);
    expect(studioRemaining()).toBe(0);
    expect(() => beginStudioRequest()).not.toThrow();
    expect(() => beginStudioRequest()).toThrow();
  });
});