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
  { id: 'indian-f', label: 'Polished Indian teacher · Marin', voice: 'marin', accent: 'indian' },
  { id: 'indian-bright-f', label: 'Bright Indian female · Willow', voice: 'willow', accent: 'indian' },
  { id: 'indian-m', label: 'Indian male dubbing · Meridian', voice: 'meridian', accent: 'indian' },
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

export type ThemeChoice = 'light' | 'dark' | 'system';
const THEME_KEY = 'snapsolve.theme';
export function applyTheme(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}
/** Light by default; dark or follow-phone on request. */
export function useThemeChoice() {
  const [choice, setChoice] = useState<ThemeChoice>('light');
  useEffect(() => {
    try { const v = localStorage.getItem(THEME_KEY); if (v === 'dark' || v === 'system') setChoice(v); } catch { /* storage unavailable */ }
  }, []);
  const update = (v: ThemeChoice) => { setChoice(v); try { localStorage.setItem(THEME_KEY, v); } catch { /* keep */ } applyTheme(v); };
  return [choice, update] as const;
}
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

/** Second-opinion fact check on tutor answers (Gemini + GPT). Default ON. */
export function useAutoVerify() {
  return useDeviceBoolean('snapsolve.auto-verify', 'snapsolve:auto-verify', true);
}

/** Gemini reads doubt photos first and hands the text to the tutor. Default ON. */
export function usePhotoReading() {
  return useDeviceBoolean('snapsolve.photo-reading', 'snapsolve:photo-reading', true);
}

/** Mera Batch: tutor sees today's classes, upcoming tests and the AITS tracker. Default OFF. */
export function useBatchContext() {
  return useDeviceBoolean('snapsolve.batch-context', 'snapsolve:batch-context', false);
}

export function readDeviceFlag(key: string, defaultValue: boolean) {
  try { const v = localStorage.getItem(key); return v === null ? defaultValue : v === '1'; } catch { return defaultValue; }
}
