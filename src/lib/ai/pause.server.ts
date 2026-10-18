import type { AiFailure } from './errors';
export async function getAiPause(id = 'workspace') {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('ai_pause_state').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
export async function setAiPause(failure: AiFailure, id = 'workspace') {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('ai_pause_state').upsert({ id, kind: failure.kind, message: failure.message, updated_at: new Date().toISOString() });
  if (error) throw error;
}
export async function clearAiPause(id = 'workspace') {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('ai_pause_state').delete().eq('id', id);
  if (error) throw error;
}