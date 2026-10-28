import { describe, expect, it } from 'vitest';
import { classifyTranscriptFile, markdownToTranscript, cleanPdfText, limitTranscript, TRANSCRIPT_TEXT_LIMIT } from '@/lib/transcript-file';

describe('transcript attachments', () => {
  it('sends video and audio files to the listening path', () => {
    expect(classifyTranscriptFile({ name: 'lecture.mp4', type: '' })).toBe('media');
    expect(classifyTranscriptFile({ name: 'class', type: 'audio/mpeg' })).toBe('media');
  });

  it('accepts md, pdf, subtitles and docx as transcript text', () => {
    expect(classifyTranscriptFile({ name: 'notes.md', type: '' })).toBe('markdown');
    expect(classifyTranscriptFile({ name: 'notes.pdf', type: 'application/pdf' })).toBe('pdf');
    expect(classifyTranscriptFile({ name: 'subs.srt', type: '' })).toBe('subtitles');
    expect(classifyTranscriptFile({ name: 'notes.docx', type: '' })).toBe('office');
    expect(classifyTranscriptFile({ name: 'photo.png', type: 'image/png' })).toBe('unsupported');
  });

  it('keeps the words of markdown notes but drops formatting', () => {
    const md = '---\ntitle: x\n---\n# Cell\n- **Mitochondria** is the [powerhouse](http://a.b)\n> [!note] Remember';
    expect(markdownToTranscript(md)).toBe('Cell\nMitochondria is the powerhouse\nRemember');
  });

  it('removes PDF page markers so they are not interpreted', () => {
    expect(cleanPdfText('[Page 1]\nHello\n\n[Page 2]\nWorld')).toBe('Hello\n\nWorld');
  });

  it('caps very long files at the server transcript limit', () => {
    const r = limitTranscript('a'.repeat(TRANSCRIPT_TEXT_LIMIT + 5));
    expect(r.truncated).toBe(true);
    expect(r.text.length).toBe(400_000);
  });
});
