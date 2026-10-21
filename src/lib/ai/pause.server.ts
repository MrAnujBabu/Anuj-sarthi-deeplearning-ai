import type { AiFailure } from './errors';
// Pause state is advisory: if the database is unreachable, the tutor keeps working.
// Every AI route reads it, so one cached read per id per minute keeps the free-tier database quiet.
async function loadPause(id: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('ai_pause_state').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
type PauseRow = Awaited<ReturnType<typeof loadPause>> | null;
// One entry per id: the workspace pause and a model pause are read together on
// every request, so a single shared slot would evict each other and always miss.
const cache = new Map<string, { at: number; value: PauseRow }>();
const TTL_MS = 60_000;

export async function getAiPause(id = 'workspace') {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const data = await loadPause(id);
    cache.set(id, { at: Date.now(), value: data ?? null });
    return data;
  } catch (e) {
    console.error('[getAiPause] pause state unavailable, continuing', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Workspace pause first, then the model's own pause — both read in parallel. */
export async function getCurrentAiPause(model: string) {
  const [workspace, modelPause] = await Promise.all([getAiPause(), getAiPause(model)]);
  return workspace ?? modelPause;
}

export async function setAiPause(failure: AiFailure, id = 'workspace') {
  cache.clear();
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('ai_pause_state').upsert({ id, kind: failure.kind, message: failure.message, updated_at: new Date().toISOString() });
    if (error) throw error;
  } catch (e) {
    console.error('[setAiPause] could not save pause state', e instanceof Error ? e.message : e);
  }
}
export async function clearAiPause(id = 'workspace') {
  cache.clear();
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('ai_pause_state').delete().eq('id', id);
  if (error) throw error;
}
