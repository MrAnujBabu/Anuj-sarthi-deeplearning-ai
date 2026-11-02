// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) },
}));

import { getAiPause, setAiPause } from '@/lib/ai/pause.server';

beforeEach(() => {
  maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  vi.useFakeTimers();
});

describe('AI pause cache (free-tier database stays quiet)', () => {
  it('reads the database at most once per minute', async () => {
    await getAiPause();
    await getAiPause();
    expect(maybeSingle).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(61_000);
    await getAiPause();
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });

  it('a freshly saved pause is visible immediately (cache invalidated)', async () => {
    await setAiPause({ kind: 'credits', message: 'no credits' } as never);
    const paused = await getAiPause();
    expect(paused).toBeNull();
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });
});

describe('workspace and model pauses are cached separately', () => {
  it('alternating workspace/model reads hit the database once each per minute', async () => {
    vi.advanceTimersByTime(120_000);
    maybeSingle.mockClear();
    for (let i = 0; i < 3; i++) { await getAiPause(); await getAiPause('anthropic/claude-fable-5-1'); }
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });
});

describe('stale key rows never block new requests', () => {
  it("ignores a saved 'key not registered' pause left by an older build", async () => {
    vi.advanceTimersByTime(120_000);
    maybeSingle.mockResolvedValue({ data: { id: 'anthropic/claude-fable-5-1', kind: 'denied', message: 'LOVABLE_API_KEY is not registered for this project' }, error: null });
    expect(await getAiPause('anthropic/claude-fable-5-1')).toBeNull();
  });
  it('keeps a genuine provider denial in place', async () => {
    vi.advanceTimersByTime(120_000);
    maybeSingle.mockResolvedValue({ data: { id: 'anthropic/claude-opus-5', kind: 'denied', message: 'Access denied by provider' }, error: null });
    expect(await getAiPause('anthropic/claude-opus-5')).toMatchObject({ kind: 'denied' });
  });
});
