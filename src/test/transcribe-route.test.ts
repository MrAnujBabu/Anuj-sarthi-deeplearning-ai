// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), fetch: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/ai/pause.server', () => ({ getAiPause: mocks.get, setAiPause: mocks.set }));
import { Route } from '@/routes/api/transcribe';
const handler = (Route as unknown as { server: { handlers: { POST: (context: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
function request(type = 'audio/wav') {
  const form = new FormData(); form.append('file', new File(['audio sample'], 'audio.wav', { type }));
  return new Request('http://localhost/api/transcribe', { method: 'POST', body: form });
}
beforeEach(() => { vi.stubEnv('LOVABLE_API_KEY', 'test-key'); vi.stubGlobal('fetch', mocks.fetch); mocks.get.mockReset().mockResolvedValue(null); mocks.set.mockReset(); mocks.fetch.mockReset(); });
describe('transcription route safety', () => {
  it('blocks voice calls while workspace credits are paused', async () => {
    mocks.get.mockResolvedValueOnce({ kind: 'credits', message: 'Add credits.' });
    const result = await handler({ request: request() });
    expect(result.status).toBe(402);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('persists a terminal credit failure and preserves its safe message', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ message: 'Add credits to resume.' }, { status: 402 }));
    const result = await handler({ request: request() });
    expect(result.status).toBe(402);
    expect((await result.json()).error).toBe('[AI_CREDITS] Add credits to resume.');
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ kind: 'credits' }));
  });
  it('rejects non-audio input before any paid call', async () => {
    expect((await handler({ request: request('application/pdf') })).status).toBe(415);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('relays successful bytes and uses the configured transcription model', async () => {
    mocks.fetch.mockResolvedValue(new Response('data: test\n\n', { headers: { 'content-type': 'text/event-stream' } }));
    const result = await handler({ request: request() });
    expect(await result.text()).toBe('data: test\n\n');
    expect(mocks.fetch.mock.calls[0]?.[1].body.get('model')).toBe('google/gemini-3.5-transcribe');
  });
});