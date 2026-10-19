import { describe, expect, it } from 'vitest';
import { trimQuizHistory } from '@/routes/api/chat';
describe('quiz history trim', () => {
  it('keeps the opener and last 12 messages', () => {
    const m = Array.from({ length: 30 }, (_, i) => i);
    expect(trimQuizHistory(m)).toEqual([0, ...m.slice(-12)]);
  });
  it('leaves short quizzes unchanged', () => {
    const m = [1, 2, 3];
    expect(trimQuizHistory(m)).toEqual(m);
  });
});
