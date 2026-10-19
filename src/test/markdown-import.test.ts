// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { extractLocally } from '@/lib/file-extract';

describe('Markdown memory import', () => {
  it('preserves markdown, unicode and line breaks without AI extraction', async () => {
    const text = '# Force\n\n**बल**\n\n| Symbol | Unit |\n| F | N |';
    expect(await extractLocally(new File([text], 'notes.markdown', { type: 'text/markdown' }))).toBe(text);
  });
  it('caps saved markdown text at 400000 characters', async () => {
    expect((await extractLocally(new File(['x'.repeat(400001)], 'notes.md')))?.length).toBe(400000);
  });
});