import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useQuizStart } from '@/hooks/use-quiz-start';

it('queues Quiz ON until the current answer finishes, once only', () => {
  const start = vi.fn();
  const { result, rerender } = renderHook(({ ready }) => useQuizStart(ready, start), { initialProps: { ready: false } });
  act(() => result.current(true));
  expect(start).toHaveBeenCalledTimes(0);
  rerender({ ready: true });
  expect(start).toHaveBeenCalledTimes(1);
  rerender({ ready: true });
  expect(start).toHaveBeenCalledTimes(1);
});
it('Quiz OFF cancels a queued quiz without interrupting the answer', () => {
  const start = vi.fn();
  const { result, rerender } = renderHook(({ ready }) => useQuizStart(ready, start), { initialProps: { ready: false } });
  act(() => { result.current(true); result.current(false); });
  rerender({ ready: true });
  expect(start).toHaveBeenCalledTimes(0);
});