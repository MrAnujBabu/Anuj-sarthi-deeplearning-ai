import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearThreadMedia, loadThreads, upsertThread, withoutStudyMedia, type Thread } from '@/lib/threads';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
const thread: Thread = { id: 'one', title: 'Physics', updatedAt: 1, messages: [{ id: 'q', role: 'user', parts: [{ type: 'text', text: '<doc name="notes.pdf">large extracted text</doc>\nWhat is force?' }, { type: 'file', mediaType: 'application/pdf', filename: 'scan.pdf', url: 'idb:scan' }, { type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,AAAA' }] }, { id: 'a', role: 'assistant', parts: [{ type: 'text', text: 'Force = mass × acceleration.' }] }] };
describe('storage safety', () => {
  it('removes media and extracted text while preserving question and answer', () => {
    const result = withoutStudyMedia(thread.messages);
    expect(JSON.stringify(result)).not.toContain('large extracted text');
    expect(result[0]?.parts.every(p => p.type !== 'file')).toBe(true);
    expect(JSON.stringify(result)).toContain('What is force?');
    expect(result[1]).toEqual(thread.messages[1]);
  });
  it('cleans all chats without changing revision cards', () => {
    upsertThread(thread);
    localStorage.setItem('snapsolve.cards.v1', '[{"id":"keep"}]');
    clearThreadMedia();
    expect(loadThreads()[0]?.messages[1]).toEqual(thread.messages[1]);
    expect(localStorage.getItem('snapsolve.cards.v1')).toBe('[{"id":"keep"}]');
    expect(loadThreads()[0]?.messages[0]?.parts.every(p => p.type === 'text')).toBe(true);
  });
  it('reports full storage without silently evicting any old thread', () => {
    upsertThread(thread);
    const before = localStorage.getItem('snapsolve.threads.v1');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(upsertThread({ ...thread, id: 'new' })).toBe(false);
    expect(localStorage.getItem('snapsolve.threads.v1')).toBe(before);
  });
});