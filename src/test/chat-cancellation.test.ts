// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { isAiCancellation } from '@/lib/ai/cancellation';
import { withLovableAiGatewayRunIdHeader } from '@/lib/ai/run-id';
afterEach(() => vi.restoreAllMocks());
it('recognizes Stop without classifying genuine failures as cancellation', () => {
  expect(isAiCancellation(new DOMException('Stopped', 'AbortError'))).toBe(true);
  expect(isAiCancellation(new Error('Provider failed'))).toBe(false);
  const controller = new AbortController(); controller.abort();
  expect(isAiCancellation(new Error('transport closed'), controller.signal)).toBe(true);
});
it('handles a first-chunk abort immediately while upstream headers are pending', async () => {
  const abort = new DOMException('Stopped', 'AbortError');
  let release: (id: string | undefined) => void = () => {};
  const ready = new Promise<string | undefined>(resolve => { release = resolve; });
  const response = new Response(new ReadableStream({ start(controller) { controller.error(abort); } }));
  const pending = withLovableAiGatewayRunIdHeader(response, { getRunId: () => undefined, waitForRunId: () => ready });
  await new Promise(resolve => setTimeout(resolve, 10));
  release(undefined);
  await expect((await pending).text()).rejects.toBe(abort);
});