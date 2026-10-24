// @vitest-environment node
import { writeFile } from 'node:fs/promises';
import { expect, it, vi } from 'vitest';
vi.mock('./ai/pause.server', () => ({ getAiPause: async () => null, setAiPause: async () => {} }));
import { answerQuestion, getLiveConfig, parseCallPrefs } from './live-relay.server';
import { comparisonTable } from './voice-format';

it.skipIf(process.env['VERIFY_VOICE_TABLE'] !== '1')('real live tutor produces a question-specific four-column table', async () => {
  const answer = await answerQuestion([
    { role: 'user', content: 'Human skeleton ke Skull aur Ribs ke liye exactly 4 columns ki table banao: Part, Bones, Location aur Function. Sirf ye do rows chahiye; Hinglish mein bolo.' },
  ], getLiveConfig(), { runID: crypto.randomUUID(), sessionID: undefined, delegationID: crypto.randomUUID() }, new AbortController().signal, () => {}, () => {}, parseCallPrefs(null));
  const parsed = comparisonTable(answer);
  expect(parsed?.table.split('\n')[0]).toBe('| Part | Bones | Location | Function |');
  expect(parsed?.table).toMatch(/\| Skull \| 22(?: bones)? \|/i);
  expect(parsed?.table).toMatch(/\| Ribs \| 24\b[^|]*\|/i);
  await writeFile('/tmp/browser/voice-table-answer.json', JSON.stringify({ rows: [{ id: 'table-tutor', role: 'assistant', text: answer }], quiz: [] }));
}, 120000);