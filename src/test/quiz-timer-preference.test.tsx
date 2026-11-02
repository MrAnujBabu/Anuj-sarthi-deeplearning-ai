import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/memory.functions', () => ({ getQuizTimer: async () => ({ seconds: 45 }) }));
import { clampQuizSeconds, useQuizTimerPreference } from '@/lib/quiz-timer-preference';
afterEach(() => { cleanup(); localStorage.clear(); });
function Control() { const timer = useQuizTimerPreference(); return <><output>{timer.seconds}</output><button onClick={() => timer.update(0)}>Off</button><button onClick={() => timer.update(null)}>Admin</button></>; }
it('uses 45s admin default, persists off and restores admin without editing Cloud', async () => {
  const view = render(<Control />); await act(async () => { await Promise.resolve(); });
  expect(screen.getByRole('status').textContent).toBe('45');
  fireEvent.click(screen.getByRole('button', { name: 'Off' })); expect(localStorage.getItem('snapsolve.quiz-timer')).toBe('0');
  view.unmount(); render(<Control />); await act(async () => { await Promise.resolve(); });
  expect(screen.getByRole('status').textContent).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: 'Admin' })); expect(screen.getByRole('status').textContent).toBe('45');
});
it('matches admin 0–600 whole-second limits', () => {
  expect(clampQuizSeconds(-1)).toBe(0); expect(clampQuizSeconds(601)).toBe(600); expect(clampQuizSeconds(2.8)).toBe(3);
});