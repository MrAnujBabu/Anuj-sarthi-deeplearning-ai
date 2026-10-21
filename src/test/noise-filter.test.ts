import { describe, it, expect } from 'vitest';
import { cleanTranscript, isNoiseOnly } from '@/lib/noise-filter';

describe('transcript noise filter', () => {
  it('drops whisper and noise tags', () => {
    expect(isNoiseOnly('[whispering]')).toBe(true);
    expect(isNoiseOnly('(background noise)')).toBe(true);
    expect(cleanTranscript('Mitochondria kya hai [inaudible]').trim()).toBe('Mitochondria kya hai');
  });
  it('drops phantom phrases from silence', () => {
    expect(isNoiseOnly('Thank you for watching!')).toBe(true);
  });
  it('keeps real speech', () => {
    expect(cleanTranscript('Option B sahi hai').trim()).toBe('Option B sahi hai');
    expect(isNoiseOnly('B')).toBe(false);
  });
});
