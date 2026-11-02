import { useEffect, useState } from 'react';

export const SPEECH_VOICES = ['Kore', 'Aoede', 'Leda'] as const;
export type SpeechVoice = typeof SPEECH_VOICES[number];
export function resolveSpeechVoice(value: unknown): SpeechVoice | undefined {
  return SPEECH_VOICES.find(voice => voice.toLowerCase() === String(value).toLowerCase());
}
export function useSpeechVoice() {
  const [voice, setVoice] = useState<SpeechVoice>('Kore');
  useEffect(() => {
    const refresh = () => { try { setVoice(resolveSpeechVoice(localStorage.getItem('snapsolve.speech-voice')) ?? 'Kore'); } catch { /* Keep device default. */ } };
    refresh(); window.addEventListener('snapsolve:speech-voice', refresh);
    return () => window.removeEventListener('snapsolve:speech-voice', refresh);
  }, []);
  const update = (value: SpeechVoice) => {
    setVoice(value);
    try { localStorage.setItem('snapsolve.speech-voice', value); window.dispatchEvent(new Event('snapsolve:speech-voice')); } catch { /* Keep in-memory selection. */ }
  };
  return [voice, update] as const;
}