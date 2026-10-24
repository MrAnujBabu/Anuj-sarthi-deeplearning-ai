import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VoiceSamples } from '@/components/voice-samples';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('pauses and resumes from the same position without reloading the sample', async () => {
  render(<VoiceSamples />);
  const audio = screen.getByLabelText('Sample audio') as HTMLAudioElement;
  fireEvent.click(screen.getByRole('button', { name: 'Play Indian teacher sample' }));
  await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(1));
  audio.currentTime = 4;
  const src = audio.src;
  fireEvent.click(screen.getByRole('button', { name: 'Pause Indian teacher sample' }));
  expect(audio.pause).toHaveBeenCalledTimes(1);
  expect(audio.currentTime).toBe(4);
  fireEvent.click(screen.getByRole('button', { name: 'Play Indian teacher sample' }));
  await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(2));
  expect(audio.currentTime).toBe(4);
  expect(audio.src).toBe(src);
});

it('replay restarts the selected sample at zero', async () => {
  render(<VoiceSamples />);
  const audio = screen.getByLabelText('Sample audio') as HTMLAudioElement;
  fireEvent.click(screen.getByRole('button', { name: 'Play Indian teacher sample' }));
  await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(1));
  audio.currentTime = 7;
  fireEvent.click(screen.getByRole('button', { name: 'Replay Indian teacher sample' }));
  await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(2));
  expect(audio.currentTime).toBe(0);
});