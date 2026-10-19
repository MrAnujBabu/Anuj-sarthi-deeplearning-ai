import { useEffect, useState } from 'react';

/** Device preference shared by admin and quiz; hydration never reads browser storage. */
function useDeviceBoolean(key: string, event: string, defaultValue: boolean) {
  const [numeric, setNumeric] = useState(defaultValue);
  useEffect(() => {
    const refresh = () => { try { const saved = localStorage.getItem(key); setNumeric(saved === null ? defaultValue : saved === '1'); } catch { /* Device storage unavailable. */ } };
    refresh();
    window.addEventListener(event, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(event, refresh); window.removeEventListener('storage', refresh); };
  }, [key, event, defaultValue]);
  const update = (value: boolean) => {
    setNumeric(value);
    try { localStorage.setItem(key, value ? '1' : '0'); window.dispatchEvent(new Event(event)); } catch { /* Keep in-memory choice. */ }
  };
  return [numeric, update] as const;
}

export function useNumericAnswerLabels() {
  return useDeviceBoolean('snapsolve.numeric-answer-labels', 'snapsolve:answer-labels', false);
}

export function useQuizKeyboardShortcuts() {
  return useDeviceBoolean('snapsolve.quiz-keyboard', 'snapsolve:quiz-keyboard', true);
}

export function useBoldQuestions() {
  return useDeviceBoolean('snapsolve.bold-questions', 'snapsolve:study-appearance', false);
}

export function useHideChatWidget() {
  return useDeviceBoolean('snapsolve.hide-chat-widget', 'snapsolve:hide-chat-widget', false);
}

export function useHideTopBar() {
  return useDeviceBoolean('snapsolve.hide-top-bar', 'snapsolve:hide-top-bar', false);
}

export const STUDY_TEXT_SIZES = ['14', '16', '18', '20'] as const;
export type StudyTextSize = typeof STUDY_TEXT_SIZES[number];
export function useStudyTextSize() {
  const [size, setSize] = useState<StudyTextSize>('16');
  useEffect(() => {
    const refresh = () => {
      try {
        const saved = localStorage.getItem('snapsolve.study-text-size');
        setSize(STUDY_TEXT_SIZES.find(value => value === saved) ?? '16');
      } catch { /* Keep default. */ }
    };
    refresh(); window.addEventListener('snapsolve:study-appearance', refresh); window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('snapsolve:study-appearance', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const update = (value: StudyTextSize) => {
    setSize(value);
    try { localStorage.setItem('snapsolve.study-text-size', value); window.dispatchEvent(new Event('snapsolve:study-appearance')); } catch { /* Keep in-memory choice. */ }
  };
  return [size, update] as const;
}
export const VOICE_CHOICES = [
  { id: 'indian-f', label: 'Indian · female', voice: 'marin', accent: 'indian' },
  { id: 'indian-m', label: 'Indian · male', voice: 'meridian', accent: 'indian' },
  { id: 'us-f', label: 'American · female', voice: 'gleam', accent: 'neutral' },
  { id: 'us-m', label: 'American · male', voice: 'meridian', accent: 'neutral' },
  { id: 'uk-m', label: 'British · male', voice: 'vesper', accent: 'neutral' },
] as const;
export type VoiceChoiceId = (typeof VOICE_CHOICES)[number]['id'];

/** Voice-mode speaker choice per device; Indian female by default. */
export function useVoiceChoice() {
  const key = 'snapsolve.voice-choice', event = 'snapsolve:voice-choice';
  const [choice, setChoice] = useState<VoiceChoiceId>('indian-f');
  useEffect(() => {
    const refresh = () => { try { const v = localStorage.getItem(key); if (VOICE_CHOICES.some(c => c.id === v)) setChoice(v as VoiceChoiceId); } catch { /* storage unavailable */ } };
    refresh();
    window.addEventListener(event, refresh);
    return () => window.removeEventListener(event, refresh);
  }, []);
  const update = (v: VoiceChoiceId) => { setChoice(v); try { localStorage.setItem(key, v); window.dispatchEvent(new Event(event)); } catch { /* keep in memory */ } };
  return [choice, update] as const;
}
