import { supabaseAdmin } from '@/integrations/supabase/client.server';
import type { Database } from '@/integrations/supabase/types';

type CallWrite = Database['public']['Tables']['voice_calls']['Insert'];

/** Serialized writes keep final usage from being overwritten by an earlier snapshot. */
export function createVoiceTracking(id: string, waitUntil: (task: Promise<unknown>) => void, onFailure: () => void) {
  let queue = Promise.resolve();
  let snapshot: CallWrite = { id };
  return (patch: Omit<CallWrite, 'id'>) => {
    snapshot = { ...snapshot, ...patch };
    const row = { ...snapshot };
    queue = queue.then(async () => {
      const { error } = await supabaseAdmin.from('voice_calls').upsert(row);
      if (error) throw new Error(error.message);
    }).catch((error) => {
      console.error('Voice history save failed', error instanceof Error ? error.message : 'Unknown failure');
      onFailure();
    });
    waitUntil(queue);
  };
}