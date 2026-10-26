import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { startSync, syncCourse, syncRecentNotes, finishSync, friendlySyncError } from './sync.server';

export const DAILY_SYNC_CRON = '30 18 * * *'; // Midnight Asia/Kolkata, every day.

type Admin = SupabaseClient<Database>;
export type SyncSteps = {
  start: typeof startSync;
  course: typeof syncCourse;
  notes: typeof syncRecentNotes;
  finish: typeof finishSync;
};

/** Used by the external scheduler; never runs from a page visit. */
export async function runDailySync(admin: Admin, steps: SyncSteps = {
  start: startSync, course: syncCourse, notes: syncRecentNotes, finish: finishSync,
}) {
  const { leaseId, courses } = await steps.start(admin);
  const counts = { courses: courses.length, classes: 0, tests: 0, warnings: 0, notes: 0 };
  try {
    // One course at a time; each course's own pool stays below six requests.
    for (const course of courses) {
      const result = await steps.course(admin, leaseId, course.enrollment_id);
      counts.classes += result.classes;
      counts.tests += result.tests;
      counts.warnings += result.warnings;
    }
    const notes = await steps.notes(admin, leaseId, 8);
    counts.notes = notes.fetched;
    counts.warnings += notes.failed;
    await steps.finish(admin, leaseId, { ok: true, message: 'Daily Vedantu sync completed', counts });
    return counts;
  } catch (error) {
    await steps.finish(admin, leaseId, { ok: false, message: friendlySyncError(error), counts });
    throw error;
  }
}