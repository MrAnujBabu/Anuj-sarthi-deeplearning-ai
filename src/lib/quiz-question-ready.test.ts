import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import { answerableQuiz } from './quiz-options';

const question: UIMessage = {
  id: 'question-two', role: 'assistant',
  parts: [{ type: 'text', text: 'Powerhouse?\n(A) Nucleus\n(B) Mitochondria\n(C) Ribosome\n(D) Golgi\n<!--quiz {"options":["A","B","C","D"]}-->' }],
};

describe('text quiz answer readiness', () => {
  it('waits until generation finishes before making A–D answerable', () => {
    expect(answerableQuiz(question, true, true)).toBeNull();
    const ready = answerableQuiz(question, true, false);
    expect(ready?.options).toEqual(['A', 'B', 'C', 'D']);
    expect(ready?.labels['B']).toBe('Mitochondria');
    expect(ready?.text).toBe('Powerhouse?');
  });
  it('a preceding A answer cannot become the selection of the next question', () => {
    const answer: UIMessage = { id: 'answer-one', role: 'user', parts: [{ type: 'text', text: 'A' }] };
    expect(answerableQuiz(answer, true, false)).toBeNull();
    expect(answerableQuiz(question, true, false)?.id).toBe('question-two');
    expect(answerableQuiz(question, true, false)).not.toHaveProperty('selectedAnswer');
  });
  it('quiz OFF keeps answer controls closed', () => {
    expect(answerableQuiz(question, false, false)).toBeNull();
  });
});