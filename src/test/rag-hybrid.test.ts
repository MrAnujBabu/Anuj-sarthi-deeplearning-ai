import { it, expect } from 'vitest';
import { bm25, rrf, hybridSearch } from '@/lib/rag/hybrid';

it('BM25 ranks the exact NCERT term highest', () => {
  const s = bm25('mitochondria ATP', ['Mitochondria make ATP', 'Chloroplast photosynthesis', 'Ribosome protein']);
  expect(s[0]!).toBeGreaterThan(s[1]!);
  expect(s[1]).toBe(0);
});

it('RRF rewards documents ranked well in both lists', () => {
  const f = rrf([['a', 'b'], ['b', 'c']]);
  expect(f.get('b')!).toBeGreaterThan(f.get('a')!);
});

it('hybrid search keeps keyword hits and drops chunks weak on both signals', () => {
  const docs = [
    { id: '1', text: 'Mitochondria is the powerhouse producing ATP', vector: [0, 1] },
    { id: '2', text: 'Unrelated geography text', vector: [0, 1] },
    { id: '3', text: 'Cell energy organelle', vector: [1, 0] },
  ];
  const r = hybridSearch('mitochondria ATP', [1, 0], docs, 5).map(d => d.id);
  expect(r).toContain('1');
  expect(r).toContain('3');
  expect(r).not.toContain('2');
});
