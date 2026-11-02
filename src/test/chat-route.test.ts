// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/agent/tools.server', () => ({ createAgentTools: () => ({}) }));
vi.mock('@/lib/memory.server', () => ({ loadTeacherMemory: vi.fn(), loadAgentBrain: vi.fn() }));
vi.mock('@/lib/ai/pause.server', () => ({ getAiPause: vi.fn().mockResolvedValue(null), setAiPause: vi.fn() }));
import { Route as ChatRoute } from '@/routes/api/chat';

const post = (body: unknown, raw = false) =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
const handler = (ChatRoute as unknown as { server: { handlers: { POST: (c: { request: Request }) => Promise<Response> } } }).server.handlers.POST;

beforeEach(() => vi.stubEnv('LOVABLE_API_KEY', 'test-key'));

describe('chat route bad-input guards', () => {
  it('rejects a null body instead of crashing', async () => {
    const res = await handler({ request: post('null', true) });
    expect(res.status).toBe(400);
  });
  it('rejects empty and malformed message lists', async () => {
    expect((await handler({ request: post({ messages: [] }) })).status).toBe(400);
    expect((await handler({ request: post({ messages: ['hello'] }) })).status).toBe(400);
    expect((await handler({ request: post('{"messages":', true) })).status).toBe(400);
  });
  it('rejects an unknown model before any paid call', async () => {
    const res = await handler({ request: post({ messages: [{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] }], model: 'made-up-model' }) });
    expect(res.status).toBe(400);
  });
  it('caps oversized pasted text with a clear 413', async () => {
    const res = await handler({ request: post({ messages: [{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'word '.repeat(60000) }] }] }) });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('too long') });
  });
  it('caps oversized attachments with a clear 413', async () => {
    const res = await handler({ request: post({ messages: [{ id: 'u', role: 'user', parts: [{ type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,' + 'A'.repeat(2_100_000) }, { type: 'text', text: 'hi' }] }] }) });
    expect(res.status).toBe(413);
    expect((await res.json()).error).toContain('too large');
  });
});
