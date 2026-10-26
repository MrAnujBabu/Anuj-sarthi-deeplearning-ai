import { supabase } from '@/integrations/supabase/client';
import { readDeviceFlag } from '@/lib/quiz-label-preference';

export async function batchRequestHeaders(): Promise<Record<string, string>> {
  if (!readDeviceFlag('snapsolve.batch-context', false)) return {};
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}