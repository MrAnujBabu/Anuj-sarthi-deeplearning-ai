import { useSyncExternalStore } from 'react';

let until = 0;
let active = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  const timer = setInterval(fn, 1000);
  return () => { listeners.delete(fn); clearInterval(timer); };
};

/** SDK retryAfter is milliseconds; HTTP Retry-After is seconds or a date. */
export function studioWaitSeconds(milliseconds?: number) {
  return typeof milliseconds === 'number' && Number.isFinite(milliseconds) && milliseconds > 0
    ? Math.max(1, Math.ceil(milliseconds / 1000)) : 60;
}

export function responseWaitSeconds(response: Response, now = Date.now()) {
  const value = response.headers.get('Retry-After');
  if (!value) return 60;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.ceil(numeric);
  return studioWaitSeconds(Date.parse(value) - now);
}

export function deferStudio(seconds: number) {
  until = Math.max(until, Date.now() + seconds * 1000);
  notify();
}

export function studioRemaining() { return Math.max(0, Math.ceil((until - Date.now()) / 1000)); }
export function beginStudioRequest() {
  const remaining = studioRemaining();
  if (remaining) throw new Error(`AI busy hai — ${remaining} second baad phir try kariye.`);
  if (active) throw new Error('Ek AI request shuru ho rahi hai — uske poora hone dein.');
  active = true;
  notify();
}
export function endStudioRequest() { active = false; notify(); }
export function useStudioRecovery() {
  const seconds = useSyncExternalStore(subscribe, studioRemaining, () => 0);
  const starting = useSyncExternalStore(subscribe, () => active, () => false);
  return { seconds, blocked: starting || seconds > 0 };
}