// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), fetch: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/ai/pause.server', () => ({ getAiPause: mocks.get, setAiPause: mocks.set }));
import { Route as VerifyRoute } from '@/routes/api/verify';
import { Route as VisionRoute } from '@/routes/api/vision-read';

type Handler = (context: { request: Request }) => Promise<Response>;
const post = (route: unknown) => (route as { server: { handlers: { POST: Handler } } }).server.handlers.POST;
const req = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const answer = { question: 'Force on 2 kg at 3 m/s²?', answer: 'F = ma = 6 N. **Answer: (B)**' };
const photo = { images: ['data:image/jpeg;base64,AAA'] };

beforeEach(() => {
  vi.stubEnv('LOVABLE_API_KEY', 'test-key');
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.get.mockReset().mockResolvedValue(null);
  mocks.set.mockReset();
  mocks.fetch.mockReset();
});

describe('answer check route', () => {
  it('never checks quiz turns (would reveal the answer) and makes no paid call', async () => {
    const res = await post(VerifyRoute)({ request: req('/api/verify', { ...answer, mode: 'quiz' }) });
    expect(res.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('stays paused while workspace AI credits are paused', async () => {
    mocks.get.mockResolvedValueOnce({ kind: 'credits', message: 'Add credits.' });
    const res = await post(VerifyRoute)({ request: req('/api/verify', answer) });
    expect(res.status).toBe(402);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('rejects empty input before any paid call', async () => {
    const res = await post(VerifyRoute)({ request: req('/api/verify', { question: '', answer: '' }) });
    expect(res.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe('photo reading route', () => {
  it('stays paused while workspace AI credits are paused', async () => {
    mocks.get.mockResolvedValueOnce({ kind: 'credits', message: 'Add credits.' });
    const res = await post(VisionRoute)({ request: req('/api/vision-read', photo) });
    expect(res.status).toBe(402);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('only accepts images', async () => {
    const res = await post(VisionRoute)({ request: req('/api/vision-read', { images: ['data:application/pdf;base64,AAA'] }) });
    expect(res.status).toBe(400);
  });
  it('saves a credit pause when the gateway reports no credits', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ message: 'Add credits to resume.' }, { status: 402 }));
    const res = await post(VisionRoute)({ request: req('/api/vision-read', photo) });
    expect(res.status).toBe(402);
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ kind: 'credits' }));
  });
  it('sends photos to Gemini 3.1 Pro and returns its reading', async () => {
    mocks.fetch.mockResolvedValue(new Response('data: {"choices":[{"delta":{"content":"Q. Find F"}}]}\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } }));
    const res = await post(VisionRoute)({ request: req('/api/vision-read', photo) });
    expect(res.status).toBe(200);
    expect((await res.json()).text).toBe('Q. Find F');
    expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body).model).toBe('google/gemini-3.1-pro-preview');
  });
});
