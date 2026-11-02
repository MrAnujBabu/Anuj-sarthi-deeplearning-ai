import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/memory.functions', () => ({ getQuizTimer: async () => ({ seconds: 45 }) }));
import { QuizTimerSettings } from '@/components/quiz-timer-settings';
afterEach(() => { cleanup(); localStorage.clear(); });
it('accepts typed custom seconds, saves on Enter and restores after reload', async () => {
  const view = render(<QuizTimerSettings />); await act(async () => { await Promise.resolve(); });
  const field = screen.getByRole('spinbutton', { name: 'Quiz timer seconds' });
  fireEvent.change(field, { target: { value: '' } });
  expect(localStorage.getItem('snapsolve.quiz-timer')).toBeNull();
  fireEvent.change(field, { target: { value: '27' } }); fireEvent.keyDown(field, { key: 'Enter' });
  expect(localStorage.getItem('snapsolve.quiz-timer')).toBe('27');
  view.unmount(); render(<QuizTimerSettings />); await act(async () => { await Promise.resolve(); });
  expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('27');
});