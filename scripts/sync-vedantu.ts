import { supabaseAdmin } from '../src/integrations/supabase/client.server';
import { startSync, syncCourse, syncRecentNotes, finishSync, SyncBusyError, friendlySyncError } from '../src/lib/vedantu/sync.server';
let leaseId: string | undefined;
try {
  const started = await startSync(supabaseAdmin);
  leaseId = started.leaseId;
  const counts = { courses: started.courses.length, classes: 0, tests: 0, warnings: 0, notes: 0 };
  for (const course of started.courses) {
    const result = await syncCourse(supabaseAdmin, leaseId, course.enrollment_id);
    counts.classes += result.classes;
    counts.tests += result.tests;
    counts.warnings += result.warnings;
  }
  const notes = await syncRecentNotes(supabaseAdmin, leaseId, 8);
  counts.notes = notes.fetched;
  counts.warnings += notes.failed;
  await finishSync(supabaseAdmin, leaseId, { ok: true, message: 'Daily Vedantu sync completed', counts });
  console.log('Vedantu sync completed:', JSON.stringify(counts));
} catch (error) {
  if (error instanceof SyncBusyError) console.log('Skipped: sync already running.');
  else {
    if (leaseId) await finishSync(supabaseAdmin, leaseId, { ok: false, message: friendlySyncError(error) });
    console.error(friendlySyncError(error));
    process.exitCode = 1;
  }
}
