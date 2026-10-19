import { describe, expect, it } from 'vitest';
import { isDuplicateMemory } from '@/lib/memory-duplicates';
describe('admin memory duplicates', () => {
  it('recognizes same extracted notes with a different title', () => {
    expect(isDuplicateMemory({ title: 'renamed.pdf', content: 'Force = ma' }, { title: 'original.pdf', content: 'Force = ma' })).toBe(true);
    expect(isDuplicateMemory({ title: 'renamed.pdf', content: 'Force = m/a' }, { title: 'original.pdf', content: 'Force = ma' })).toBe(false);
  });
  it('recognizes repeated link fragments without conflating distinct sheets', () => {
    expect(isDuplicateMemory({ title: 'a', content: '', source_url: 'https://example.com/quiz#top' }, { title: 'b', content: '', source_url: 'https://example.com/quiz' })).toBe(true);
    expect(isDuplicateMemory({ title: 'a', content: 'one', source_url: 'https://example.com/quiz?sheet=1' }, { title: 'b', content: 'two', source_url: 'https://example.com/quiz?sheet=2' })).toBe(false);
  });
});