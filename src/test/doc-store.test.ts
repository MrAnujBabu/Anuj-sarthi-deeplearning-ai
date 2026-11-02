import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { clearDocumentStore, restoreDocs, stripDocs } from '@/lib/doc-store';
const messages: UIMessage[] = [{ id: 'pdf', role: 'user', parts: [{ type: 'file', filename: 'force.pdf', mediaType: 'application/pdf', url: 'data:application/pdf;base64,UEZERg==' }] }];
afterEach(async () => { vi.restoreAllMocks(); await clearDocumentStore(); });
it('commits PDF pointers only after data is stored and reload restores it', async () => {
  const stored = await stripDocs(messages);
  expect(JSON.stringify(stored)).toContain('idb:');
  expect(await restoreDocs(stored)).toEqual(messages);
});
it('reports failed PDF writes without returning a broken pointer and permits retry', async () => {
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
  await expect(stripDocs(messages)).rejects.toThrow('Full');
  failure.mockRestore();
  expect(await restoreDocs(await stripDocs(messages))).toEqual(messages);
});
it('cleanup removes stored documents without changing the input messages', async () => {
  const stored = await stripDocs(messages);
  await clearDocumentStore();
  expect(JSON.stringify(await restoreDocs(stored))).toContain('no longer available');
  expect(JSON.stringify(messages)).toContain('data:application/pdf');
});