import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('@/lib/memory.functions', () => ({ getQuizTimer: async () => ({ seconds: 0 }) }));
vi.mock('@/components/ai-elements/message', () => ({ MessageResponse: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
import { QuizActions } from '@/components/quiz-actions';
afterEach(cleanup);
describe('quiz answer commands', () => {
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