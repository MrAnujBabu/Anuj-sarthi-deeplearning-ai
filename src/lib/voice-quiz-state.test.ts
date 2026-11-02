import { expect, it } from 'vitest';
import { initialVoiceQuizState, reduceVoiceQuiz } from './voice-quiz-state';

const question = (id: string, text: string) => ({ type: 'app.quiz.question', questionId: id, text, labels: { A: `${id} A`, B: `${id} B`, C: `${id} C`, D: `${id} D` } });
it('keeps the previous question and options together until the next playback finishes', () => {
  let state = reduceVoiceQuiz(initialVoiceQuizState, question('q1', 'First question?'));
  state = reduceVoiceQuiz(state, { type: 'app.quiz.playback.ready', questionId: 'q1' });
  state = reduceVoiceQuiz(state, { type: 'app.quiz.submitted', questionId: 'q1', answer: 'skip' });
  state = reduceVoiceQuiz(state, question('q2', 'Second question?'));
  expect(state.question).toEqual({ id: 'q1', text: 'First question?', labels: { A: 'q1 A', B: 'q1 B', C: 'q1 C', D: 'q1 D' } });
  expect(state.picked).toBe('skip');
  state = reduceVoiceQuiz(state, { type: 'app.quiz.playback.ready', questionId: 'q1' });
  expect(state.question?.id).toBe('q1');
  state = reduceVoiceQuiz(state, { type: 'app.quiz.playback.ready', questionId: 'q2' });
  expect(state.question?.text).toBe('Second question?');
  expect(state.question?.labels['B']).toBe('q2 B');
  expect(state.picked).toBeUndefined();
  expect(state.ready).toBe(true);
});
it('stale answer acknowledgements cannot pick or reopen the new question', () => {
  let state = reduceVoiceQuiz(initialVoiceQuizState, question('q2', 'Second question?'));
  state = reduceVoiceQuiz(state, { type: 'app.quiz.manual.ready', questionId: 'q2' });
  state = reduceVoiceQuiz(state, { type: 'app.quiz.submitted', questionId: 'q2', answer: 'B' });
  expect(reduceVoiceQuiz(state, { type: 'app.quiz.rejected', questionId: 'q1' })).toBe(state);
  expect(reduceVoiceQuiz(state, { type: 'app.quiz.accepted', questionId: 'q1', answer: 'skip' })).toBe(state);
  expect(state.picked).toBe('B');
  expect(reduceVoiceQuiz(state, { type: 'app.quiz.rejected', questionId: 'q2', retryable: false })).toBe(state);
});
it('a current rejected send permits a retry without replacing its question/options', () => {
  let state = reduceVoiceQuiz(initialVoiceQuizState, question('q1', 'First question?'));
  state = reduceVoiceQuiz(state, { type: 'app.quiz.manual.ready', questionId: 'q1' });
  state = reduceVoiceQuiz(state, { type: 'app.quiz.submitted', questionId: 'q1', answer: 'B' });
  state = reduceVoiceQuiz(state, { type: 'app.quiz.rejected', questionId: 'q1' });
  expect(state.retry).toBe(1); expect(state.picked).toBeUndefined(); expect(state.question?.labels['B']).toBe('q1 B');
});