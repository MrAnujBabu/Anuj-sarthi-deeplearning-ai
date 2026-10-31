import { describe, it, expect } from 'vitest';
import { spokenWords, spokenWordCount } from '@/lib/word-highlight';

describe('word-level voice-over highlight', () => {
  it('splits Hindi and mixed text into words', () => {
    expect(spokenWords('यह एक परीक्षण है')).toEqual(['यह', 'एक', 'परीक्षण', 'है']);
    expect(spokenWords('  NEET 2027 के लिए  ')).toEqual(['NEET', '2027', 'के', 'लिए']);
    expect(spokenWords('')).toEqual([]);
  });
  it('highlights words in proportion to the audio clock', () => {
    const text = 'एक दो तीन चार पाँच छह सात आठ';
    expect(spokenWordCount(text, 0)).toBe(0);
    expect(spokenWordCount(text, 0.5)).toBe(4);
    expect(spokenWordCount(text, 1)).toBe(8);
  });
  it('clamps out-of-range fractions and never exceeds the word count', () => {
    const text = 'एक दो तीन';
    expect(spokenWordCount(text, -0.5)).toBe(0);
    expect(spokenWordCount(text, 1.7)).toBe(3);
    expect(spokenWordCount(text, Number.NaN)).toBe(0);
    expect(spokenWordCount('', 0.5)).toBe(0);
  });
});
