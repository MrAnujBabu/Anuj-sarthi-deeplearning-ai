import type { AiFailure } from './errors';
// Pause state is advisory: if the database is unreachable, the tutor keeps working.
// Every AI route reads it, so one cached read per minute keeps the free-tier database quiet.
async function loadPause(id: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('ai_pause_state').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
type PauseRow = Awaited<ReturnType<typeof loadPause>> | null;
let cache: { id: string; at: number; value: PauseRow } | null = null;
const TTL_MS = 60_000;

export async function getAiPause(id = 'workspace') {
  if (cache && cache.id === id && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const data = await loadPause(id);
    cache = { id, at: Date.now(), value: data ?? null };
    return data;
  } catch (e) {
    console.error('[getAiPause] pause state unavailable, continuing', e instanceof Error ? e.message : e);
    return null;
  }
}
export async function setAiPause(failure: AiFailure, id = 'workspace') {
  cache = null;
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('ai_pause_state').upsert({ id, kind: failure.kind, message: failure.message, updated_at: new Date().toISOString() });
    if (error) throw error;
  } catch (e) {
    console.error('[setAiPause] could not save pause state', e instanceof Error ? e.message : e);
  }
}
export async function clearAiPause(id = 'workspace') {
  cache = null;
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('ai_pause_state').delete().eq('id', id);
  if (error) throw error;
}
