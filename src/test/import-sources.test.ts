import { describe, expect, it } from 'vitest';
import { ankiToStudyItems, validateImportSize, capText, csvToStudyItems, directImportUrl, parseCsv } from '@/lib/import-sources';
import { recoveryItemSchema } from '@/lib/admin-backup';

describe('admin import sources', () => {
  it('preserves PYQ year and source URL on import', () => {
    const item = csvToStudyItems('question,year,source_url\nForce?,2021,https://example.org/2021.pdf', 'pyq')[0];
    expect(item?.source_url).toBe('https://example.org/2021.pdf');
    expect(item?.content).toContain('Year: 2021');
    expect(() => csvToStudyItems('question,source_url\nForce?,javascript:alert(1)', 'pyq')).toThrow();
  });
  it('accepts 25 MB and rejects larger imports', () => {
    expect(() => validateImportSize(25 * 1024 * 1024)).not.toThrow();
    expect(() => validateImportSize(25 * 1024 * 1024 + 1)).toThrow('25 MB');
  });
  it('imports raw Anki notes with tags and preserves cloze notation', () => {
    const rows = ankiToStudyItems('#separator:Tab\n#html:true\nFront\tBack\tTags\nATP {{c1::energy}}\tCell fuel\tbiology cell');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'flashcard', content: 'Front: ATP {{c1::energy}}\nBack: Cell fuel\nTags: biology cell' });
  });
  it('imports raw Anki JSON fields without losing back text', () => {
    expect(ankiToStudyItems('{"notes":[{"fields":["Force?","Newton"],"tags":["physics"]}]}')[0]?.content).toBe('Front: Force?\nBack: Newton\nTags: physics');
  });
  it('rejects one-column Anki input', () => {
    expect(() => ankiToStudyItems('not a note')).toThrow('Front and Back');
  });
  it('routes three mixed sheet kinds without losing assertion reason', () => {
    const rows = csvToStudyItems('type,question,answer,reason\npyq,Force?,Newton,\nflashcard,ATP?,Energy,\nassertion_reason,Force changes momentum,Both true,Rate of change\n', 'fact');
    expect(rows.map(r => r.kind)).toEqual(['pyq', 'flashcard', 'assertion_reason']);
    expect(rows[2]?.content).toContain('Reason: Rate of change');
  });
  it('converts a Google Sheets share link to a CSV export keeping the tab', () => {
    expect(directImportUrl('https://docs.google.com/spreadsheets/d/abc_123/edit#gid=42').url)
      .toBe('https://docs.google.com/spreadsheets/d/abc_123/export?format=csv&gid=42');
  });
  it('converts a Google Drive file link to a direct download', () => {
    expect(directImportUrl('https://drive.google.com/file/d/XYZ-9/view?usp=sharing').url)
      .toBe('https://drive.google.com/uc?export=download&id=XYZ-9');
  });
  it('parses quoted CSV cells with commas and newlines', () => {
    expect(parseCsv('a,b\n"x, y","line1\nline2"\n')).toEqual([['a', 'b'], ['x, y', 'line1\nline2']]);
  });
  it('turns CSV rows into study items, honouring a type column', () => {
    const items = csvToStudyItems('question,answer,subject,type\nUnit of force?,Newton,Physics,pyq\nATP?,Energy,Biology,\n', 'flashcard');
    expect(items.map(i => i.kind)).toEqual(['pyq', 'flashcard']);
    expect(items[0]?.content).toContain('Answer: Newton');
    expect(items[0]?.subject).toBe('Physics');
  });
  it('caps link text at 400,000 characters', () => {
    const c = capText('x'.repeat(400_005));
    expect(c.chars).toBe(400_000);
    expect(c.truncated).toBe(true);
  });
  it('backup accepts the new study types', () => {
    expect(recoveryItemSchema.shape.kind.safeParse('assertion_reason').success).toBe(true);
  });
});
