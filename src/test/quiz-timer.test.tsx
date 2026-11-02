import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
let seconds = 3;
vi.mock('@/lib/quiz-timer-preference', () => ({ useQuizTimerPreference: () => ({ seconds }) }));
vi.mock('@/components/ai-elements/message', () => ({ MessageResponse: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
import { QuizActions } from '@/components/quiz-actions';
afterEach(() => { cleanup(); vi.useRealTimers(); seconds = 3; localStorage.clear(); });
it('voice countdown waits for question delivery while option taps remain usable', () => {
  vi.useFakeTimers(); const send = vi.fn();
  const view = render(<QuizActions answersOnly timed timerPaused questionKey="q1" options={['A','B']} onSend={send} />);
  act(() => vi.advanceTimersByTime(20000)); expect(send).not.toHaveBeenCalled();
  view.rerender(<QuizActions answersOnly timed questionKey="q1" options={['A','B']} onSend={send} />);
  act(() => vi.advanceTimersByTime(2000)); expect(send).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1000)); expect(send.mock.calls).toEqual([['skip']]);
});
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
it('voice expiry submits skip once and the next question accepts a tap', () => {
  vi.useFakeTimers(); const send = vi.fn();
  const view = render(<QuizActions answersOnly timed questionKey="q1" options={['A','B','C','D']} onSend={send} />);
  act(() => vi.advanceTimersByTime(3000));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Answer B' }));
  expect(send.mock.calls).toEqual([['skip']]);
  view.rerender(<QuizActions answersOnly timed questionKey="q2" options={['A','B','C','D']} onSend={send} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Answer B' }));
  act(() => vi.advanceTimersByTime(5000));
  expect(send.mock.calls).toEqual([['skip'], ['B']]);
});
it('voice wall-clock expiry catches up after suspended timers', () => {
  vi.useFakeTimers(); const send = vi.fn();
  render(<QuizActions answersOnly timed questionKey="q1" options={['A','B']} onSend={send} />);
  vi.setSystemTime(Date.now() + 10000);
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(send.mock.calls).toEqual([['skip']]);
});
it('failed voice send leaves the current options usable', () => {
  const send = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
  render(<QuizActions answersOnly questionKey="q1" options={['A','B']} onSend={send} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Answer A' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Answer B' }));
  expect(send.mock.calls).toEqual([['A'], ['B']]);
});
it('rejected voice submission can be reset without changing question ID', () => {
  const send = vi.fn(); const view = render(<QuizActions answersOnly questionKey="q1" options={['A','B']} onSend={send} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Answer A' }));
  view.rerender(<QuizActions answersOnly retryKey={1} questionKey="q1" options={['A','B']} onSend={send} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Answer B' }));
  expect(send.mock.calls).toEqual([['A'], ['B']]);
});