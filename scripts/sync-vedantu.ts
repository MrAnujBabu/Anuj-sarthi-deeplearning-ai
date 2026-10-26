/** GitHub Actions entry point. Credentials are injected only into this step. */
import { supabaseAdmin } from '../src/integrations/supabase/client.server';
import { runDailySync } from '../src/lib/vedantu/daily-sync.server';
import { SyncBusyError, friendlySyncError } from '../src/lib/vedantu/sync.server';

try {
  const counts = await runDailySync(supabaseAdmin);
  console.log('Vedantu sync completed:', JSON.stringify(counts));
} catch (error) {
  if (error instanceof SyncBusyError) {
    console.log('Skipped: a manual or scheduled sync is already running.');
  } else {
    console.error(friendlySyncError(error));
    process.exitCode = 1;
  }
}