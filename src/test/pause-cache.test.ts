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
