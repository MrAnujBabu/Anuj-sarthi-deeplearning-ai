import { describe, expect, it } from 'vitest';
import { parseVoiceSession, parseVoiceTranscript, quizResults, quizVerdict, voiceTranscriptMarkdown, type VoiceQuizEntry, type VoiceRow } from '@/lib/voice-transcript';
import { mdToHtml } from '@/lib/transcript-export';

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


const labels = { A: 'Nucleus', B: 'Mitochondria', C: 'Ribosome', D: 'Golgi body' };
const quizRows: VoiceRow[] = [
  { id: 'a1', role: 'assistant', text: 'Question 1. Cell ka powerhouse kaun hai? (A) Nucleus (B) Mitochondria (C) Ribosome (D) Golgi body' },
  { id: 'u1', role: 'user', text: 'Answer C — Ribosome' },
  { id: 'a2', role: 'assistant', text: 'Close tha! Sahi jawab (B) hai — Mitochondria. Detail mein: ATP yahin banta hai.' },
];
const wrong: VoiceQuizEntry = { id: 'q1', text: quizRows[0]!.text, labels, answer: 'C', answerRowId: 'u1' };

describe('voice quiz in exports', () => {
  it('lists every A–D option with the right answer and the student answer', () => {
    const md = voiceTranscriptMarkdown(quizRows, [wrong], { style: 'plain' });
    expect(md).toContain('| **A** | Nucleus |  |');
    expect(md).toContain('| **B** | Mitochondria | ✅ Sahi jawab |');
    expect(md).toContain('| **C** | Ribosome | ❌ Tumhara jawab |');
    expect(md).toContain('Score 0/1');
    expect(md).toContain('Cell ka powerhouse kaun hai?');
  });
  it('counts a right answer and a skipped question', () => {
    const right = quizResults([{ id: 'u', role: 'user', text: 'Answer B' }, { id: 'r', role: 'assistant', text: 'Shabash! Sahi jawab (B) hai.' }], [{ id: 'q', text: '', labels, answer: 'B', answerRowId: 'u' }]);
    expect(right[0]?.status).toBe('right');
    const skipped = quizResults([{ id: 'u', role: 'user', text: 'Skipped' }, { id: 'r', role: 'assistant', text: 'Correct answer is D.' }], [{ id: 'q', text: '', labels, answer: 'skip', answerRowId: 'u' }]);
    expect(skipped[0]).toMatchObject({ status: 'skipped', correct: 'D' });
  });
  it('never guesses a verdict the tutor did not say', () => {
    expect(quizVerdict('Sahi jawab (B) hai')).toBe('B');
    expect(quizVerdict('Correct answer is C.')).toBe('C');
    expect(quizVerdict('Sahi answer: D')).toBe('D');
    expect(quizVerdict('Sahi jawab a gaya, agla sawal')).toBeNull();
    expect(quizVerdict('Agla sawal suno')).toBeNull();
  });
  it('re-imports the call with its quiz answers intact', () => {
    const session = parseVoiceSession(voiceTranscriptMarkdown(quizRows, [wrong]));
    expect(session.rows).toEqual(quizRows);
    expect(session.quiz).toEqual([wrong]);
  });
  it('keeps the hidden import copy out of Word/PDF while the option table stays a table', () => {
    const md = voiceTranscriptMarkdown(quizRows, [wrong], { embedData: false, style: "plain" });
    expect(md).not.toContain('snapsolve-voice-data');
    const html = mdToHtml(voiceTranscriptMarkdown(quizRows, [wrong], { style: "plain" }));
    expect(html).not.toContain('snapsolve-voice-data');
    expect(html).toContain('<td>Mitochondria</td>');
  });
});

describe('Obsidian-style markdown export', () => {
  it('turns verdict blockquotes into typed callouts', () => {
    const md = voiceTranscriptMarkdown(quizRows, [wrong]);
    expect(md).toContain('> [!failure] ❌ Galat');
    expect(md).not.toContain('> **❌ Galat**');
    expect(md).toContain('  - snapsolve');
    expect(md).toContain('  - voice-call');
  });
  it('turns detail toggles into foldable callouts', () => {
    const md = voiceTranscriptMarkdown([
      { id: 'a', role: 'assistant', text: 'Shabash! Sahi jawab (B) hai — Mitochondria. Detail mein: ATP yahin banta hai aur isliye ise powerhouse kehte hain.' },
    ]);
    expect(md).toContain('> [!note]- 📂 ATP yahin banta hai');
    expect(md).toContain('> ATP yahin banta hai aur isliye ise powerhouse kehte hain.');
    expect(md).not.toContain('<details>');
  });
  it('plain style keeps the screen style for Word/PDF', () => {
    const md = voiceTranscriptMarkdown(quizRows, [wrong], { style: "plain" });
    expect(md).toContain('> **❌ Galat**');
    expect(md).not.toContain('[!failure]');
  });
  it('still re-imports losslessly from Obsidian-style exports', () => {
    const session = parseVoiceSession(voiceTranscriptMarkdown(quizRows, [wrong]));
    expect(session.rows).toEqual(quizRows);
    expect(session.quiz).toEqual([wrong]);
  });
});

describe('recall flashcards export (Obsidian)', () => {
  it('turns a wrong quiz answer into a red card with the answer hidden in the fold', () => {
    const md = voiceTranscriptMarkdown(quizRows, [wrong]);
    expect(md).toMatch(/> \[!recall-red\]- Q1\. .*Cell ka powerhouse kaun hai\?/);
    expect(md).toContain('> **Answer:** **(B) Mitochondria**');
    expect(md).toContain('> **Tumhara jawab:** (C) ❌');
    expect(md).not.toContain('<details>');
  });
  it('turns a spoken student question into a Q&A card with the tutor reply as answer', () => {
    const rows: VoiceRow[] = [
      { id: 'u', role: 'user', text: 'Mitochondria ko powerhouse kyun kehte hain?' },
      { id: 'a', role: 'assistant', text: 'Kyunki ATP yahin banta hai.' },
    ];
    const md = voiceTranscriptMarkdown(rows, []);
    expect(md).toContain('> [!recall-green]- Q1. Mitochondria ko powerhouse kyun kehte hain?');
    expect(md).toContain('ATP yahin banta hai');
  });
  it('does not make a card from a quiz answer or a one-word reply', () => {
    const md = voiceTranscriptMarkdown([{ id: 'u', role: 'user', text: 'haan' }, { id: 'a', role: 'assistant', text: 'Theek hai.' }], []);
    expect(md).not.toContain('[!recall-');
  });
});
