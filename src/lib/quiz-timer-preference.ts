import { useEffect, useState } from 'react';
import { getQuizTimer } from './memory.functions';
const KEY = 'snapsolve.quiz-timer';
const EVENT = 'snapsolve:quiz-timer';
let cached: Promise<{ seconds: number }> | undefined;
let cachedAt = 0;
export function clampQuizSeconds(value: number) { return Math.max(0, Math.min(600, Math.round(Number(value) || 0))); }
export function useQuizTimerPreference() {
  const [override, setOverride] = useState<number | null>(null);
  const [adminSeconds, setAdminSeconds] = useState(0);
  useEffect(() => {
    let live = true;
    const refresh = () => { try { const raw = localStorage.getItem(KEY); setOverride(raw === null ? null : clampQuizSeconds(Number(raw))); } catch { /* Use admin default. */ } };
    refresh(); window.addEventListener(EVENT, refresh); window.addEventListener('storage', refresh);
    if (!cached || Date.now() - cachedAt > 30000) { cachedAt = Date.now(); cached = getQuizTimer(); }
    void cached.then(result => { if (live) setAdminSeconds(clampQuizSeconds(result.seconds)); }).catch(() => { cached = undefined; });
    return () => { live = false; window.removeEventListener(EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const update = (value: number | null) => {
    const normalized = value === null ? null : clampQuizSeconds(value);
    setOverride(normalized);
    try { if (normalized === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, String(normalized)); window.dispatchEvent(new Event(EVENT)); } catch { /* Keep local choice. */ }
  };
  return { seconds: override ?? adminSeconds, adminSeconds, override, update };
}