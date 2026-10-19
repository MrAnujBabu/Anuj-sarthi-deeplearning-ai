import { it, expect, vi } from 'vitest';
const { upsert } = vi.hoisted(() => ({ upsert: vi.fn(async (_row: unknown) => ({ error: null })) }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: () => ({ upsert }) } }));
import { createVoiceTracking } from './voice-tracking.server';
it('preserves call identity and documents in serialized updates', async () => {
  const tasks: Promise<unknown>[] = [];
  const track = createVoiceTracking('call-1', p => tasks.push(p), () => {});
  track({ voice: 'marin', quiz: true, documents: [{ name: 'test.pdf' }] });
  track({ answer_count: 2 });
  track({ confirmed_seconds: 90, finalized: true, status: 'closed' });
  await Promise.all(tasks);
  expect(upsert.mock.calls.at(-1)?.[0]).toEqual({ id: 'call-1', voice: 'marin', quiz: true, documents: [{ name: 'test.pdf' }], answer_count: 2, confirmed_seconds: 90, finalized: true, status: 'closed' });
});