// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), render: vi.fn() }));
vi.mock('@/lib/error-capture', () => ({ consumeLastCapturedError: () => undefined }));
vi.mock('@/lib/error-page', () => ({ renderErrorPage: mocks.render }));
vi.mock('@/lib/live-relay.server', () => ({ handleLiveRequest: vi.fn() }));
vi.mock('@tanstack/react-start/server-entry', () => ({ default: { fetch: mocks.fetch } }));
import server from '@/server';
afterEach(() => vi.restoreAllMocks());
it('handles a framework disconnect outside the route without logging a page crash', async () => {
  const controller = new AbortController();
  mocks.fetch.mockImplementation(async () => { controller.abort(); throw new Error('HTTPError', { cause: controller.signal.reason }); });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const response = await server.fetch(new Request('http://localhost/api/sarvam-speech', { signal: controller.signal }), {}, {});
  expect(response.status).toBe(499);
  expect(log).not.toHaveBeenCalled();
  expect(mocks.render).not.toHaveBeenCalled();
});
it('does not turn a swallowed disconnect response into an SSR crash page', async () => {
  const controller = new AbortController();
  mocks.fetch.mockImplementation(async () => { controller.abort(); return Response.json({ status: 500, unhandled: true, message: 'HTTPError' }, { status: 500 }); });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const response = await server.fetch(new Request('http://localhost/api/sarvam-speech', { signal: controller.signal }), {}, {});
  expect(response.status).toBe(499);
  expect(log).not.toHaveBeenCalled();
});