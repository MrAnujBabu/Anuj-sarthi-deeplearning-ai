import { it, expect, vi } from 'vitest';
const { upsert } = vi.hoisted(() => ({ upsert: vi.fn(async (_row: unknown) => ({ error: null })) }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: () => ({ upsert }) } }));
import { createVoiceTracking } from './voice-tracking.server';
it('never saves voice call history or schedules database work, including final usage', async () => {
  upsert.mockClear();
  const tasks: Promise<unknown>[] = [];
  const failure = vi.fn();
  const track = createVoiceTracking('call-1', p => tasks.push(p), failure);
  track({ voice: 'marin', quiz: true, documents: [{ name: 'test.pdf' }] });
  track({ answer_count: 2 });
  track({ confirmed_seconds: 90, finalized: true, status: 'closed' });
  await Promise.all(tasks);
  expect(upsert).not.toHaveBeenCalled();
  expect(tasks).toHaveLength(0);
  expect(failure).not.toHaveBeenCalled();
});