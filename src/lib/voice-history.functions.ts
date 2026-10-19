import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listVoiceCalls = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (role.error || role.data !== true) throw new Error('Access denied');
    const { data, error } = await context.supabase.from('voice_calls').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });