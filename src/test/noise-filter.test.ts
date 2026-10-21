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

describe('traffic and machinery noise', () => {
  it('drops vehicle, factory, weather and animal sound tags', () => {
    expect(isNoiseOnly('(car horn)')).toBe(true);
    expect(isNoiseOnly('(engine noise)')).toBe(true);
    expect(isNoiseOnly('(traffic)')).toBe(true);
    expect(isNoiseOnly('[dog barking]')).toBe(true);
    expect(isNoiseOnly('(factory machine)')).toBe(true);
    expect(isNoiseOnly('(train passing)')).toBe(true);
    expect(isNoiseOnly('(हॉर्न)')).toBe(true);
  });
  it('keeps the speech around a noise tag', () => {
    expect(cleanTranscript('Beta suno (bus passing) ye important hai').trim()).toBe('Beta suno ye important hai');
  });
  it('never eats real speech containing these words outside tags', () => {
    expect(cleanTranscript('Train ka example samjho').trim()).toBe('Train ka example samjho');
  });
});
