// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { sarvamStreamEvents } from '@/lib/sarvam-speech';
const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), fetch: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/ai/pause.server', () => ({ getCurrentAiPause: mocks.get, setAiPause: mocks.set }));
import { Route } from '@/routes/api/sarvam-speech';
const handler = (Route as unknown as { server: { handlers: { POST: (context: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
const request = (signal?: AbortSignal) => new Request('http://localhost/api/sarvam-speech', { method: 'POST', body: JSON.stringify({ voice: 'shubh_hi_customer', text: 'नमस्ते' }), ...(signal ? { signal } : {}) });
beforeEach(() => {
  vi.stubEnv('SARVAM_API_KEY', 'test');
  vi.stubEnv('UDC_SARVAM_AI_API_KEY', '');
  vi.stubEnv('LOVABLE_API_KEY', '');
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockReset(); mocks.get.mockReset().mockResolvedValue(null); mocks.set.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('uses the linked Sarvam connection even without a direct provider key', async () => {
  vi.stubEnv('SARVAM_API_KEY', '');
  vi.stubEnv('UDC_SARVAM_AI_API_KEY', 'test-connection');
  vi.stubEnv('LOVABLE_API_KEY', 'test-app');
  mocks.fetch.mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4])));
  const response = await handler({ request: request() });
  expect(response.status).toBe(200);
  expect(mocks.fetch).toHaveBeenCalledWith('https://connector-gateway.lovable.dev/udc_sarvam_ai/text-to-speech/stream', expect.objectContaining({
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-app', 'X-Connection-Api-Key': 'test-connection' },
  }));
  expect(await response.text()).toContain('speech.audio.delta');
});
it('does not send a connection key to the provider or bypass the gateway when the app key is missing', async () => {
  vi.stubEnv('UDC_SARVAM_AI_API_KEY', 'test-connection');
  expect((await handler({ request: request() })).status).toBe(503);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it('reports missing credentials as configuration without contacting Sarvam or persisting a pause', async () => {
  vi.stubEnv('SARVAM_API_KEY', '');
  const response = await handler({ request: request() });
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain('[AI_CONFIGURATION]');
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.set).not.toHaveBeenCalled();
});
it('preserves an upstream 503 without bypassing the connection or pausing speech', async () => {
  vi.stubEnv('UDC_SARVAM_AI_API_KEY', 'test-connection');
  vi.stubEnv('LOVABLE_API_KEY', 'test-app');
  mocks.fetch.mockResolvedValue(Response.json({ message: 'Service temporarily unavailable' }, { status: 503 }));
  const response = await handler({ request: request() });
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain('Service temporarily unavailable');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(mocks.set).not.toHaveBeenCalled();
});
it('does not start a provider request after cancellation', async () => {
  const abort = new AbortController(); abort.abort();
  expect((await handler({ request: request(abort.signal) })).status).toBe(499);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it('treats cross-realm fetch AbortError as cancellation, not provider failure', async () => {
  mocks.fetch.mockRejectedValue({ name: 'AbortError', message: 'This operation was aborted' });
  expect((await handler({ request: request() })).status).toBe(499);
  expect(mocks.set).not.toHaveBeenCalled();
});
it('ends cross-realm aborted audio reads quietly', async () => {
  const pcm = new ReadableStream<Uint8Array>({ start(c) { c.error({ name: 'AbortError' }); } });
  expect(await new Response(sarvamStreamEvents(pcm)).text()).toBe('');
});
it('does not reject when upstream cancellation rejects', async () => {
  const pcm = new ReadableStream<Uint8Array>({ cancel() { return Promise.reject(new DOMException('Stopped', 'AbortError')); } });
  await expect(sarvamStreamEvents(pcm).cancel()).resolves.toBeUndefined();
});
it('preserves genuine provider failures without pausing credits', async () => {
  mocks.fetch.mockRejectedValue(new Error('Network disconnected'));
  expect((await handler({ request: request() })).status).toBe(503);
  expect(mocks.set).not.toHaveBeenCalled();
});
it('sends the upgraded model and exact persona with unchanged streaming PCM settings', async () => {
  mocks.fetch.mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4])));
  const response = await handler({ request: request() });
  expect(response.status).toBe(200);
  expect(mocks.get).toHaveBeenCalledWith('sarvam/bulbul:v4-flash');
  const call = mocks.fetch.mock.calls[0];
  if (!call) throw new Error('Expected a Sarvam provider request');
  const [url, options] = call;
  expect(url).toBe('https://api.sarvam.ai/text-to-speech/stream');
  expect(JSON.parse(options.body)).toEqual({ text: 'नमस्ते', language_code: 'hi-IN',
    model: 'bulbul:v4-flash', speaker: 'shubh_hi_customer', speech_sample_rate: 24000,
    output_audio_codec: 'linear16', pace: 1.35 });
  expect(await response.text()).toContain('speech.audio.delta');
});