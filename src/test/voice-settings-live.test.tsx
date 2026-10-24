import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const { updateSettings, start, stop } = vi.hoisted(() => ({ updateSettings: vi.fn(() => true), start: vi.fn(), stop: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options, Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock('@/lib/talk-turn', () => ({ usesTalkTurns: () => false }));
vi.mock('@/lib/live-endpoint', () => ({ prewarmLiveRelay: () => {} }));
vi.mock('@/lib/memory.functions', () => ({ getQuizTimer: async () => ({ seconds: 0 }) }));
vi.mock('@/hooks/use-live-voice', () => ({
  PLAYBACK_SPEEDS: [1],
  useLiveVoice: () => ({ status: 'connected', rate: 1, connectMs: null, audioRef: { current: null }, updateSettings, start, stop, setRate: () => true, setEchoGate: vi.fn() }),
}));
import { Route } from '@/routes/voice';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('connected voice teaching switches send settings without ending or restarting the call', async () => {
  HTMLElement.prototype.scrollTo = vi.fn();
  const Component = (Route as unknown as { component: () => React.ReactNode }).component;
  render(<Component />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Voice settings and search' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Voice settings and search' }));
  for (const [name, key] of [
    ['Voice quiz mode', 'quiz'], ['Match the Following questions', 'matchQ'],
    ['Assertion Reason questions', 'assertionQ'], ['Advanced deep NCERT questions', 'deep'], ['Voice live search', 'search'],
  ] as const) {
    const toggle = screen.getByRole('switch', { name });
    expect(toggle).toBeEnabled();
    fireEvent.click(toggle);
    expect(updateSettings).toHaveBeenLastCalledWith({ [String(key)]: true });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  }
  expect(screen.getByRole('combobox', { name: 'AI model' })).toBeEnabled();
  expect(screen.getByRole('combobox', { name: /^Voice$/ })).toBeDisabled();
  expect(screen.getByRole('switch', { name: 'Read scanned PDFs' })).toBeDisabled();
  expect(start).not.toHaveBeenCalled();
  expect(stop).not.toHaveBeenCalled();
});