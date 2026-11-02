import { describe, expect, it } from 'vitest';
import { dedupeSnippets, extractSnippets, MAX_SNIPPETS_PER_CHAPTER, snippetToCard, structureQuizQueue, topicQuizPrompt } from '@/lib/ncert-snippets';

const MD = [
  '# Cell: The Unit of Life',
  'A cell is the basic structural and functional unit of life. All organisms are composed of cells. ' +
  'The cell theory was proposed by Schleiden and Schwann and later modified by Virchow who said omnis cellula e cellula.',
  '## Prokaryotic Cells',
  'Prokaryotic cells lack a membrane-bound nucleus. Bacteria are examples. They have a cell wall, ' +
  'ribosomes of the 70S type, and genetic material that lies naked in the cytoplasm called the nucleoid.',
  '## Eukaryotic Cells',
  'Eukaryotic cells have a true nucleus bound by a double membrane. They contain membrane-bound ' +
  'organelles such as mitochondria, endoplasmic reticulum, Golgi apparatus and lysosomes.',
  '## Tiny',
  'Too short.',
].join('\n\n');

describe('extractSnippets', () => {
  it('splits markdown into topic snippets and skips tiny sections', () => {
    const s = extractSnippets(MD);
    const topics = s.map((x) => x.topic);
    expect(topics).toContain('Cell: The Unit of Life');
    expect(topics).toContain('Prokaryotic Cells');
    expect(topics).toContain('Eukaryotic Cells');
    expect(topics).not.toContain('Tiny');
    expect(s.every((x) => x.text.length >= 80)).toBe(true);
  });

  it('strips links, images and tables from snippet text', () => {
    const s = extractSnippets('## Topic\n\nSee [this](https://x.com) and ![img](https://x.com/i.png). ' + 'Cell structure detail. '.repeat(10));
    expect(s[0]?.text).not.toContain('https://');
    expect(s[0]?.text).not.toContain('![');
  });

  it('caps snippets per chapter', () => {
    const big = Array.from({ length: 30 }, (_, i) => `## Topic ${i}\n\n${'Unique content number ' + i + ' about cells. '.repeat(6)}`).join('\n\n');
    expect(extractSnippets(big).length).toBeLessThanOrEqual(MAX_SNIPPETS_PER_CHAPTER);
  });
});

describe('dedupeSnippets', () => {
  it('drops near-duplicate text, keeps the first', () => {
    const a = { topic: 'A', text: 'The mitochondria is the powerhouse of the cell and makes ATP through respiration.' };
    const b = { topic: 'B', text: 'The mitochondria is the powerhouse of the cell and makes ATP through respiration!' };
    const c = { topic: 'C', text: 'Ribosomes synthesise proteins in the cytoplasm of all living cells.' };
    expect(dedupeSnippets([a, b, c]).map((s) => s.topic)).toEqual(['A', 'C']);
  });
});

describe('snippetToCard', () => {
  it('builds an SRS card with the NCERT line as the answer', () => {
    const card = snippetToCard({ topic: 'Prokaryotic Cells', text: 'Prokaryotic cells lack a membrane-bound nucleus.' }, 'NCERT Class 11 Biology · Chapter 8');
    expect(card.a).toContain('membrane-bound nucleus');
    expect(card.q).toContain('Prokaryotic Cells');
    expect(card.topic).toBe('Prokaryotic Cells');
    expect(card.box).toBe(1);
  });

  it('tags unverified snippets as verify pending', () => {
    const card = snippetToCard({ topic: 'X', text: 'Some line.', verified: false }, 'ch');
    expect(card.topic).toContain('verify pending');
  });
});

describe('structureQuizQueue', () => {
  it('keeps chapter order and dedupes topics case-insensitively', () => {
    const q = structureQuizQueue([
      { topic: 'Cell Theory', text: 'x' },
      { topic: 'Prokaryotes', text: 'y' },
      { topic: 'cell theory', text: 'z' },
      { topic: 'Eukaryotes', text: 'w' },
    ]);
    expect(q).toEqual(['Cell Theory', 'Prokaryotes', 'Eukaryotes']);
  });
});

describe('topicQuizPrompt', () => {
  it('names the chapter, topic and excerpt', () => {
    const p = topicQuizPrompt('NCERT Class 11 Biology · Chapter 8', 'Prokaryotes', 'Prokaryotic cells lack a nucleus.');
    expect(p).toContain('Chapter 8');
    expect(p).toContain('Prokaryotes');
    expect(p).toContain('lack a nucleus');
  });
});
