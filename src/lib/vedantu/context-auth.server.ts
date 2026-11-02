import { createClient } from '@supabase/supabase-js';

export type BatchAuthResult = { ok: true } | { ok: false; status: 401 | 403 | 503; error: string };

/** Verifies a Supabase access token belongs to an admin. Never logs the token. */
export async function authorizeBatchToken(token: string | null | undefined): Promise<BatchAuthResult> {
  if (!token) return { ok: false, status: 401, error: 'Mera Batch ke liye admin sign in karein.' };
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) return { ok: false, status: 503, error: 'Batch access is not configured.' };
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: 'Mera Batch ke liye admin sign in karein.' };
  const role = await client.rpc('has_role', { _user_id: data.user.id, _role: 'admin' });
  if (role.error || role.data !== true) return { ok: false, status: 403, error: 'Mera Batch sirf admin ke liye hai.' };
  return { ok: true };
}

/** Batch data is private even when the ordinary tutor is public. */
export async function authorizeBatchContext(request: Request): Promise<Response | null> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get('authorization') ?? '');
  const result = await authorizeBatchToken(match?.[1]);
  return result.ok ? null : Response.json({ error: result.error }, { status: result.status });
}
