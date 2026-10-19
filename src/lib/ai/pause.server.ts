import type { AiFailure } from './errors';
// Pause state is advisory: if the database is unreachable, the tutor keeps working.
export async function getAiPause(id = 'workspace') {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin.from('ai_pause_state').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[getAiPause] pause state unavailable, continuing', e instanceof Error ? e.message : e);
    return null;
  }
}
export async function setAiPause(failure: AiFailure, id = 'workspace') {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('ai_pause_state').upsert({ id, kind: failure.kind, message: failure.message, updated_at: new Date().toISOString() });
    if (error) throw error;
  } catch (e) {
    console.error('[setAiPause] could not save pause state', e instanceof Error ? e.message : e);
  }
}
export async function clearAiPause(id = 'workspace') {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('ai_pause_state').delete().eq('id', id);
  if (error) throw error;
}
