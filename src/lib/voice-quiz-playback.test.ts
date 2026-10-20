import { expect, it } from 'vitest';
import { VoiceQuizPlayback } from './voice-quiz-playback';
it('requires heard audio, final option captions and sustained silence', () => {
  const p = new VoiceQuizPlayback(); p.begin('q1', 'Golgi');
  expect(p.sample(0, 5000, true)).toBeNull();
  p.sample(0.1, 6000, true); p.transcript('A Nucleus');
  expect(p.sample(0, 10000, true)).toBeNull();
  p.transcript('D Golgi'); expect(p.sample(0, 11000, false)).toBeNull();
  expect(p.sample(0, 13000, true)).toBeNull();
  expect(p.sample(0, 14500, true)).toBe('q1');
  expect(p.sample(0, 16000, true)).toBeNull();
});
it('does not inherit previous question playback', () => {
  const p = new VoiceQuizPlayback(); p.begin('q1', 'Golgi');
  p.transcript('D Golgi'); p.sample(0.1, 0, true); p.begin('q2', 'Pith');
  expect(p.sample(0, 5000, true)).toBeNull();
  p.sample(0.1, 6000, true); p.transcript('D Pith'); p.sample(0, 7000, true);
  expect(p.sample(0, 8500, true)).toBe('q2');
});