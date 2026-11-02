import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { DAILY_SYNC_CRON, runDailySync, type SyncSteps } from '@/lib/vedantu/daily-sync.server';

const admin = {} as SupabaseClient<Database>;
function steps(): SyncSteps {
  return {
    start: vi.fn().mockResolvedValue({ leaseId: 'lease', courses: [{ enrollment_id: 'course-1', title: 'NEET' }] }),
    course: vi.fn().mockResolvedValue({ classes: 90, tests: 12, warnings: 0 }),
    notes: vi.fn().mockResolvedValue({ fetched: 8, remaining: 0, failed: 0 }),
    finish: vi.fn().mockResolvedValue(undefined),
  };
}

describe('daily Vedantu sync', () => {
  it('schedules daily at 00:00 India time (18:30 UTC)', () => {
    expect(DAILY_SYNC_CRON).toBe('30 18 * * *');
    const midnight = new Date('2026-10-23T18:30:00Z');
    expect(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(midnight)).toBe('00:00');
  });
  it('fetches courses and notes and saves actual counts', async () => {
    const deps = steps();
    expect(await runDailySync(admin, deps)).toEqual({ courses: 1, classes: 90, tests: 12, warnings: 0, notes: 8 });
    expect(deps.course).toHaveBeenCalledWith(admin, 'lease', 'course-1');
    expect(deps.finish).toHaveBeenCalledWith(admin, 'lease', expect.objectContaining({ ok: true }));
  });
  it('releases the lease and records failure instead of reporting success', async () => {
    const deps = steps();
    vi.mocked(deps.course).mockRejectedValue(new Error('Vedantu unavailable'));
    await expect(runDailySync(admin, deps)).rejects.toThrow('Vedantu unavailable');
    expect(deps.finish).toHaveBeenCalledWith(admin, 'lease', expect.objectContaining({ ok: false, message: 'Vedantu unavailable' }));
    expect(deps.notes).not.toHaveBeenCalled();
  });
});