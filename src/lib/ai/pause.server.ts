import { isKeyRegistryProblem, type AiFailure } from './errors';
import { creditPauseDecision } from './pause-policy';
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

/**
 * A credits pause must not block forever: once credits are added the app has to notice.
 * After the cooldown exactly one request (atomic claim on updated_at) is let through as a probe;
 * a 402 re-pauses, a success clears the row via noteAiSuccess().
 */
async function claimCreditProbe(row: NonNullable<PauseRow>) {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from('ai_pause_state').update({ updated_at: now }).eq('id', row.id).eq('updated_at', row.updated_at).select('id');
    if (error) throw error;
    return { claimed: (data?.length ?? 0) > 0, refreshed: { ...row, updated_at: now } };
  } catch (e) {
    console.error('[getAiPause] probe claim failed', e instanceof Error ? e.message : e);
    return { claimed: false, refreshed: row };
  }
}

export async function getAiPause(id = 'workspace') {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) {
    if (!hit.value || creditPauseDecision(hit.value, Date.now()) === 'block') return hit.value;
  }
  try {
    const row = await loadPause(id);
    // Older builds saved "key not registered" as a model denial. That is a key setup
    // problem, fixed by updating the key, so such rows never block new requests.
    const data = row && typeof row.message === 'string' && isKeyRegistryProblem(row.message) ? null : row;
    if (data && creditPauseDecision(data, Date.now()) === 'probe') {
      const { claimed, refreshed } = await claimCreditProbe(data);
      cache.set(id, { at: Date.now(), value: refreshed });
      return claimed ? null : refreshed;
    }
    cache.set(id, { at: Date.now(), value: data ?? null });
    return data ?? null;
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

/** A real AI call succeeded: a remembered credits pause is stale, so remove it (only credits rows). */
export async function noteAiSuccess(id = 'workspace') {
  const hit = cache.get(id);
  if (hit && hit.value?.kind !== 'credits') return;
  try {
    cache.delete(id);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('ai_pause_state').delete().eq('id', id).eq('kind', 'credits');
    cache.set(id, { at: Date.now(), value: null });
  } catch (e) {
    console.error('[noteAiSuccess] could not clear pause', e instanceof Error ? e.message : e);
  }
}
