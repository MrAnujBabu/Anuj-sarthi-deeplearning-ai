// @vitest-environment node
import { expect, it } from 'vitest';
import { isCancellationLog } from '@/lib/error-capture';
it('recognizes HTTP wrappers around a disconnected request', () => {
  expect(isCancellationLog(new Error('HTTPError', { cause: new DOMException('Stopped', 'AbortError') }))).toBe(true);
  const wrapped = new Error('This operation was aborted', { cause: new DOMException('Stopped', 'AbortError') });
  wrapped.name = 'HTTPError';
  expect(isCancellationLog(wrapped)).toBe(true);
});
it('keeps genuine failures and message-only matches visible', () => {
  expect(isCancellationLog(new Error('AbortError: This operation was aborted'))).toBe(false);
  expect(isCancellationLog(new Error('HTTPError', { cause: new Error('Network failed') }))).toBe(false);
  expect(isCancellationLog(new Error('Database failed', { cause: new DOMException('Stopped', 'AbortError') }))).toBe(false);
});