import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mock.getUser }, rpc: mock.rpc }) }));
import { authorizeBatchContext } from '@/lib/vedantu/context-auth.server';

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'public-test');
  mock.getUser.mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null });
  mock.rpc.mockResolvedValue({ data: true, error: null });
});
describe('private batch context', () => {
  it('refuses a signed-out request', async () => {
    expect((await authorizeBatchContext(new Request('https://app.test/api/chat')))?.status).toBe(401);
  });
  it('refuses signed-in non-admins', async () => {
    mock.rpc.mockResolvedValue({ data: false, error: null });
    expect((await authorizeBatchContext(new Request('https://app.test/api/chat', { headers: { Authorization: 'Bearer user-token' } })))?.status).toBe(403);
  });
  it('allows a verified admin', async () => {
    expect(await authorizeBatchContext(new Request('https://app.test/api/chat', { headers: { Authorization: 'Bearer admin-token' } }))).toBeNull();
    expect(mock.rpc).toHaveBeenCalledWith('has_role', { _user_id: 'admin-id', _role: 'admin' });
  });
});