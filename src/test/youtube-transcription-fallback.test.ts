import { afterEach, describe, expect, it, vi } from 'vitest';

const listener = vi.hoisted(() => vi.fn());
vi.mock('@/lib/ai/pause.server', () => ({ getAiPause: async () => null, noteAiSuccess: async () => {}, setAiPause: async () => {} }));
vi.mock('@/lib/interpreter.server', () => ({
  InterpretError: class extends Error { constructor(message: string, public status: number) { super(message); } },
  listenYouTube: listener,
  makeBrief: async () => ({ brief: null, model: 'test' }),
  normalizeBrief: () => null,
  interpretProse: vi.fn(),
  interpretTimed: async () => ({ lines: ['नमस्ते।'], interpreters: ['test'], quality: { reviewers: [], reviewed: 0, corrected: 0 } }),
  describeFailure: (error: { message: string; status?: number }) => ({ message: error.message, status: error.status ?? 503 }),
}));
vi.mock('@/lib/web-video.server', () => ({ resolveWebVideo: vi.fn(), fetchCaptionsText: vi.fn(), WebVideoError: class extends Error {} }));

import { Route } from '@/routes/api/youtube-hindi';

afterEach(() => { vi.unstubAllGlobals(); listener.mockReset(); });

describe('transcription request with YouTube bot check', () => {
  it('blocks explicit restrictions even when YouTube includes a title and caption track', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ videoDetails: { title: 'Private lecture' },
      playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'This is a private video' },
      captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: 'https://example.com/captions', languageCode: 'en' }] } },
    })));
    const handlers = Route.options.server?.handlers;
    if (!handlers || typeof handlers === 'function' || typeof handlers.POST !== 'function') throw new Error('POST missing');
    const handler = handlers.POST;
    const response = await handler({ request: new Request('http://localhost/api/youtube-hindi', { method: 'POST', body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' }) }) } as Parameters<typeof handler>[0]);
    if (!(response instanceof Response)) throw new Error('Response missing');
    const events = (await response.text()).trim().split('\n').map(line => JSON.parse(line));
    expect(events.find(event => event.type === 'error')?.status).toBe(422);
    expect(listener).not.toHaveBeenCalled();
  });
  it('reaches independent listening and returns interpreted results instead of requesting pasted text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'Sign in to confirm you’re not a bot' } })));
    listener.mockResolvedValue({ language: 'en', cues: [{ start: 0, end: 15, text: 'Hello.' }] });
    const handlers = Route.options.server?.handlers;
    if (!handlers || typeof handlers === 'function') throw new Error('Handler record missing');
    const handler = handlers.POST;
    if (typeof handler !== 'function') throw new Error('POST handler missing');
    const response = await handler({ request: new Request('http://localhost/api/youtube-hindi', { method: 'POST', body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', quality: false }) }) } as Parameters<typeof handler>[0]);
    if (!(response instanceof Response)) throw new Error('Streaming response missing');
    const events = (await response.text()).trim().split('\n').map(line => JSON.parse(line));
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]?.[0]).toBe('jNQXAC9IVRw');
    expect(events.some(event => event.type === 'error')).toBe(false);
    expect(events.find(event => event.type === 'done')?.result.source.origin).toBe('listened');
  });
});