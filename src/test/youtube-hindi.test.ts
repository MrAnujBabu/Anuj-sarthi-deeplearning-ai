import { describe, it, expect } from 'vitest';
import { parseYouTubeId, splitForSpeech, timedTextToPlain } from '@/lib/youtube-hindi';

describe('youtube-hindi', () => {
  it('reads IDs from watch, short, shorts links', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?si=x')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
  it('decodes caption XML', () => {
    expect(timedTextToPlain('<p t="1">We&#39;re here</p><p t="2">and\nnow</p>')).toBe("We're here and now");
  });
  it('keeps every speech piece within the limit', () => {
    const text = 'यह एक वाक्य है। '.repeat(300);
    const parts = splitForSpeech(text, 1200);
    expect(parts.every(p => p.length <= 1200)).toBe(true);
    expect(parts.join(' ').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
  });
});

import { timedSegments, parseNumberedBlocks } from '@/lib/youtube-hindi';
describe('dub segments', () => {
  it('groups captions into time windows and drops [Music] tags', () => {
    const xml = '<p t="0" d="2000">[Music]</p><p t="1000" d="2000">a</p><p t="20000" d="2000">b</p><p t="40000" d="5000">c</p>';
    expect(timedSegments(xml, 30)).toEqual([{ start: 1, end: 22, text: 'a b' }, { start: 40, end: 45, text: 'c' }]);
  });
  it('maps numbered blocks back to their segment', () => {
    expect(parseNumberedBlocks('### 2\nदो\n### 1\nएक', 3)).toEqual(['एक', 'दो', '']);
  });
});
