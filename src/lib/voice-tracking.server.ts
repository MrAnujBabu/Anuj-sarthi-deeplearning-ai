import type { Database } from '@/integrations/supabase/types';

type CallWrite = Database['public']['Tables']['voice_calls']['Insert'];

/** Intentionally disabled: live usage/cleanup remain owned by the relay, not history. */
export function createVoiceTracking(_id: string, _waitUntil: (task: Promise<unknown>) => void, _onFailure: () => void) {
  return (_patch: Omit<CallWrite, 'id'>) => {};
}