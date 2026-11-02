// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentTools } from '@/lib/agent/tools.server';
beforeEach(() => { vi.stubEnv('LOVABLE_API_KEY', 'test'); vi.stubEnv('PARALLEL_API_KEY', 'test'); vi.stubEnv('FIRECRAWL_API_KEY', 'test'); });
describe('student document links', () => {
  it('reads PDF text using Parallel without scraping twice', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ results: [{ title: 'NCERT', full_content: 'Question: What is inertia?' }] }));
    vi.stubGlobal('fetch', fetch);
    const tool = createAgentTools().read_link;
    const result = await tool.execute?.({ url: 'https://ncert.nic.in/textbook/pdf/leph101.pdf' }, { toolCallId: 'test', messages: [], context: {} });
    expect(result).toMatchObject({ text: 'Question: What is inertia?', title: 'NCERT' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('falls back to Firecrawl when the first reader cannot extract text', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ results: [] })).mockResolvedValueOnce(Response.json({ data: { markdown: 'PDF chapter text' } }));
    vi.stubGlobal('fetch', fetch);
    const result = await createAgentTools().read_link.execute?.({ url: 'https://example.org/notes.pdf' }, { toolCallId: 'test', messages: [], context: {} });
    expect(result).toMatchObject({ text: 'PDF chapter text' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('reports empty extraction instead of claiming the document was read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({ results: [], data: { markdown: '' } })));
    const result = await createAgentTools().read_link.execute?.({ url: 'https://example.org/empty.pdf' }, { toolCallId: 'test', messages: [], context: {} });
    expect(result).toMatchObject({ error: expect.stringContaining('no readable text') });
  });
  it('does not expose live search when the toggle is off', () => {
    expect(createAgentTools()).not.toHaveProperty('web_search');
    expect(createAgentTools({ webSearch: true })).toHaveProperty('web_search');
  });
});