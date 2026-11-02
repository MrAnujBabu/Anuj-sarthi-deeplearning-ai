import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const stream = vi.hoisted(() => ({ onEvent: undefined as undefined | ((event: Record<string, unknown>) => void) }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options, Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock('@/lib/live-endpoint', () => ({ prewarmLiveRelay: () => {} }));
vi.mock('@/lib/memory.functions', () => ({ getQuizTimer: async () => ({ seconds: 0 }) }));
vi.mock('@/hooks/use-live-voice', () => ({
  PLAYBACK_SPEEDS: [1],
  useLiveVoice: ({ onEvent }: { onEvent: typeof stream.onEvent }) => {
    stream.onEvent = onEvent;
    return { status: 'connected', rate: 1, connectMs: null, audioRef: { current: null }, updateSettings: () => true, start: vi.fn(), stop: vi.fn(), setRate: () => true, setEchoGate: vi.fn() };
  },
}));
import { Route } from '@/routes/voice';
afterEach(() => { cleanup(); stream.onEvent = undefined; });
it('accumulates live captions into a growing four-column table without restarting the call', async () => {
  HTMLElement.prototype.scrollTo = vi.fn();
  const Component = (Route as unknown as { component: () => React.ReactNode }).component;
  render(<Component />);
  await waitFor(() => expect(stream.onEvent).toBeDefined());
  const emit = (delta: string) => act(() => stream.onEvent?.({ type: 'session.output_transcript.delta', delta }));
  emit('Table: Part, Bones, Location aur Function. Row: Skull; 22; Head; Protection. ');
  emit('Row: Ribs; 24; Chest; Protection. Row: Sternum; 1; ');
  const table = await screen.findByRole('table');
  expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Part', 'Bones', 'Location', 'Function']);
  expect(within(table).getAllByRole('row')).toHaveLength(3);
  emit('Chest; Support. Table khatam.');
  await waitFor(() => expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(4));
  expect(within(screen.getByRole('table')).getByText('Sternum')).toBeInTheDocument();
});