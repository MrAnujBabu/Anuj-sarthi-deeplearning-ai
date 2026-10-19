import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
let seconds = 3;
vi.mock('@/lib/quiz-timer-preference', () => ({ useQuizTimerPreference: () => ({ seconds }) }));
vi.mock('@/components/ai-elements/message', () => ({ MessageResponse: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
import { QuizActions } from '@/components/quiz-actions';
afterEach(() => { cleanup(); vi.useRealTimers(); seconds = 3; localStorage.clear(); });
it('three seconds counts down then submits skip exactly once', () => {
  vi.useFakeTimers(); const send = vi.fn(); render(<QuizActions questionKey="one" options={['A','B']} onSend={send} />);
  expect(send).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1000)); expect(send).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1000)); expect(send).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1000)); expect(send.mock.calls).toEqual([['skip']]);
  act(() => vi.advanceTimersByTime(5000)); expect(send).toHaveBeenCalledTimes(1);
});
it('off never skips and grading pauses countdown', () => {
  vi.useFakeTimers(); seconds = 0; const send = vi.fn(); const view = render(<QuizActions options={['A']} onSend={send} />);
  act(() => vi.advanceTimersByTime(10000)); expect(send).not.toHaveBeenCalled();
  seconds = 1; view.rerender(<QuizActions disabled options={['A']} onSend={send} />);
  act(() => vi.advanceTimersByTime(10000)); expect(send).not.toHaveBeenCalled();
  view.rerender(<QuizActions options={['A']} onSend={send} />);
  act(() => vi.advanceTimersByTime(1000)); expect(send.mock.calls).toEqual([['skip']]);
});
it('changing timer after answering cannot reopen the same question', () => {
  vi.useFakeTimers(); const send = vi.fn(); const view = render(<QuizActions questionKey="one" options={['A','B']} onSend={send} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Answer B' }));
  seconds = 10; view.rerender(<QuizActions questionKey="one" options={['A','B']} onSend={send} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Answer A' }));
  act(() => vi.advanceTimersByTime(12000)); expect(send.mock.calls).toEqual([['B']]);
});