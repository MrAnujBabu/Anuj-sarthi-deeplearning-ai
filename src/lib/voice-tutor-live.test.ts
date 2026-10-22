// @vitest-environment node
import { expect, it, vi } from 'vitest';
vi.mock('./ai/pause.server', () => ({ getAiPause: async () => null, setAiPause: async () => {} }));
import { answerQuestion, getLiveConfig, parseCallPrefs } from './live-relay.server';
it.skipIf(process.env['VERIFY_LIVE_TUTOR'] !== '1')('real voice delegate uses advanced Claude and generates a selectable next MCQ', async () => {
  const config = getLiveConfig();
  expect(config.backendModel).toBe('anthropic/claude-opus-5-5');
  const answer = await answerQuestion([
    { role: 'user', content: 'Ask one simple NEET mitochondria MCQ with A-D options.' },
  ], config, { runID: crypto.randomUUID(), sessionID: undefined, delegationID: crypto.randomUUID() }, new AbortController().signal, () => {}, () => {}, parseCallPrefs({ quiz: true }));
  const { voiceQuizOptions } = await import('./voice-quiz');
  expect(Object.keys(voiceQuizOptions(answer) ?? {})).toEqual(['A', 'B', 'C', 'D']);
  const next = await answerQuestion([
    { role: 'user', content: 'Ask one simple NEET mitochondria MCQ with A-D options.' },
    { role: 'assistant', content: answer },
    { role: 'user', content: 'Time is up, I skipped this question. Tell me the correct answer in one short line, then give the next MCQ.' },
  ], config, { runID: crypto.randomUUID(), sessionID: undefined, delegationID: crypto.randomUUID() }, new AbortController().signal, () => {}, () => {}, parseCallPrefs({ quiz: true }));
  expect(Object.keys(voiceQuizOptions(next) ?? {})).toEqual(['A', 'B', 'C', 'D']);
  expect(next).not.toBe(answer);
}, 120000);