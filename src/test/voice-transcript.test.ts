import { describe, expect, it } from 'vitest';
import { parseVoiceTranscript, voiceTranscriptMarkdown } from '@/lib/voice-transcript';

describe('voice transcript export/import', () => {
  it('round-trips an exported call', () => {
    const md = voiceTranscriptMarkdown([
      { id: '1', role: 'user', text: 'Mitochondria kya hai?' },
      { id: '2', role: 'assistant', text: 'Powerhouse of the cell.\nATP banata hai.' },
    ]);
    const rows = parseVoiceTranscript(md);
    expect(rows.map(r => [r.role, r.text])).toEqual([
      ['user', 'Mitochondria kya hai?'],
      ['assistant', 'Powerhouse of the cell.\nATP banata hai.'],
    ]);
  });
});
