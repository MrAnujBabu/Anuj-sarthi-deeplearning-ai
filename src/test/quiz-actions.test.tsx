import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('@/lib/quiz-timer-preference', () => ({ useQuizTimerPreference: () => ({ seconds: 0 }) }));
vi.mock('@/components/ai-elements/message', () => ({ MessageResponse: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
import { QuizActions } from '@/components/quiz-actions';
afterEach(async () => { await act(async () => { await Promise.resolve(); }); cleanup(); localStorage.clear(); });
describe('quiz answer commands', () => {
  it('number labels from Settings still submit B for key 2', () => {
    localStorage.setItem('snapsolve.numeric-answer-labels', '1');
    const send = vi.fn(); render(<QuizActions options={['A','B','C','D']} onSend={send} />);
    expect(screen.getByRole('checkbox', { name: 'Answer B' }).textContent).toBe('2');
    fireEvent.keyDown(window, { key: '2' });
    expect(send.mock.calls).toEqual([['B']]);
  });
  it('quiz bar has no duplicate label switch', () => {
    render(<QuizActions options={['A','B','C','D']} onSend={vi.fn()} />);
    expect(screen.queryByRole('switch', { name: 'Number answer labels' })).toBeNull();
  });
  it.each([['1','A'],['2','B'],['3','C'],['4','D']])('key %s selects %s once', (key, answer) => {
    const send = vi.fn(); render(<QuizActions options={['A','B','C','D']} onSend={send} />);
    fireEvent.keyDown(window, { key }); fireEvent.keyDown(window, { key });
    expect(send.mock.calls).toEqual([[answer]]);
  });
  it('ignores typing, modifiers, key repeat and grading', () => {
    const send = vi.fn(); const view = render(<><textarea aria-label="draft" /><QuizActions options={['A']} onSend={send} /></>);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: '1' });
    fireEvent.keyDown(window, { key: '1', metaKey: true });
    fireEvent.keyDown(window, { key: '1', repeat: true });
    view.rerender(<QuizActions options={['A']} disabled onSend={send} />);
    fireEvent.keyDown(window, { key: '1' });
    expect(send).not.toHaveBeenCalled();
  });
  it('changes chat visibility without submitting an AI command', () => {
    const send = vi.fn(); const hide = vi.fn();
    render(<QuizActions options={['A']} onSend={send} onChatHidden={hide} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Hide Chat Widget' }));
    expect(hide).toHaveBeenCalledWith(true);
    expect(send).not.toHaveBeenCalled();
  });
  it.each([['Numpad1', 'End', 'A'], ['Numpad2', 'ArrowDown', 'B'], ['Numpad3', 'PageDown', 'C'], ['Numpad4', 'ArrowLeft', 'D']])('keypad %s with Num Lock off submits its letter', (code, key, answer) => {
    const send = vi.fn(); render(<QuizActions options={['A','B','C','D']} onSend={send} />);
    fireEvent.keyDown(window, { key, code });
    expect(send.mock.calls).toEqual([[answer]]);
  });
  it.each([['Numpad1', '1', 'A'], ['Numpad2', '2', 'B'], ['Numpad3', '3', 'C'], ['Numpad4', '4', 'D']])('keypad %s with Num Lock on submits its letter', (code, key, answer) => {
    const send = vi.fn(); render(<QuizActions options={['A','B','C','D']} onSend={send} />);
    fireEvent.keyDown(window, { key, code });
    expect(send.mock.calls).toEqual([[answer]]);
  });
  it('does not submit when shortcuts are off or settings are open', () => {
    localStorage.setItem('snapsolve.quiz-keyboard', '0');
    const send = vi.fn(); const view = render(<QuizActions options={['B']} onSend={send} />);
    fireEvent.keyDown(window, { key: '2', code: 'Numpad2' });
    expect(send).not.toHaveBeenCalled();
    view.unmount(); localStorage.removeItem('snapsolve.quiz-keyboard');
    render(<><div role="dialog">Settings</div><QuizActions options={['B']} onSend={send} /></>);
    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'Numpad2' });
    expect(send).not.toHaveBeenCalled();
  });
  it('submits an option only once and resets for a new question', () => {
    const send = vi.fn();
    const view = render(<QuizActions options={['A', 'B']} onSend={send} questionKey="one" />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Answer A' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Answer B' }));
    expect(send.mock.calls).toEqual([['A']]);
    view.rerender(<QuizActions options={['A', 'B']} onSend={send} questionKey="two" />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Answer B' }));
    expect(send.mock.calls).toEqual([['A'], ['B']]);
  });
  it('does not send an answer while grading', () => {
    const send = vi.fn();
    render(<QuizActions options={['A']} disabled onSend={send} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Answer A' }));
    expect(send).not.toHaveBeenCalled();
  });
  it.each([['Hint', 'hint'], ['Skip', 'skip'], ['Stop quiz', 'stop quiz']])('sends the %s command once', (label, command) => {
    const send = vi.fn();
    render(<QuizActions options={['A']} onSend={send} />);
    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(send.mock.calls).toEqual([[command]]);
  });
});