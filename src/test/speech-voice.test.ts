import { expect, it } from 'vitest';
import { resolveSpeechVoice } from '@/lib/speech-voice';
it.each(['Kore', 'Aoede', 'Leda'] as const)('supports requested speech voice %s', voice => {
  expect(resolveSpeechVoice(voice.toLowerCase())).toBe(voice);
});
it('never treats an uploaded sample or live preset as a TTS identity', () => {
  expect(resolveSpeechVoice('mithali')).toBeUndefined();
  expect(resolveSpeechVoice('marin')).toBeUndefined();
});