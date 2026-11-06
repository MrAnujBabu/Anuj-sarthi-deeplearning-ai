/** Browser-only daily study log: doubts answered, quiz turns and saved-card reviews per local day. */
import type { Thread } from "./threads";

export type ActivityKind = "doubt" | "quiz" | "review";
export type DayActivity = { doubts: number; quiz: number; reviews: number };
export type ActivityLog = { days: Record<string, DayActivity>; seen: string[]; seeded?: boolean };

const KEY = "snapsolve.activity.v1";
const GOAL_KEY = "snapsolve.daily-goal";
const MAX_SEEN = 1500;
const MAX_DAYS = 400;
export const DEFAULT_DAILY_GOAL = 5;
export const GOAL_CHOICES = [3, 5, 10, 15, 20] as const;

const EMPTY_DAY: DayActivity = { doubts: 0, quiz: 0, reviews: 0 };
const FIELD: Record<ActivityKind, keyof DayActivity> = { doubt: "doubts", quiz: "quiz", review: "reviews" };

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDay(ts: number, days: number): number {
  const d = new Date(ts);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function emptyLog(): ActivityLog {
  return { days: {}, seen: [] };
}

/** Accepts only well-formed stored data so a damaged entry never breaks the home page. */
export function parseLog(value: unknown): ActivityLog {
  if (!value || typeof value !== "object") return emptyLog();
  const raw = value as Record<string, unknown>;
  const days: Record<string, DayActivity> = {};
  if (raw["days"] && typeof raw["days"] === "object") {
    for (const [k, v] of Object.entries(raw["days"] as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== "object") continue;
      const day = v as Record<string, unknown>;
      const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);
      days[k] = { doubts: num(day["doubts"]), quiz: num(day["quiz"]), reviews: num(day["reviews"]) };
    }
  }
  const seen = Array.isArray(raw["seen"]) ? raw["seen"].filter((s): s is string => typeof s === "string") : [];
  return { days, seen, ...(raw["seeded"] === true ? { seeded: true } : {}) };
}

/** Counts one activity once per id (an answer re-rendered or reloaded never counts twice). */
export function addActivity(log: ActivityLog, kind: ActivityKind, id: string, now: number): ActivityLog {
  if (log.seen.includes(id)) return log;
  const key = dayKey(now);
  const day = { ...EMPTY_DAY, ...log.days[key] };
  day[FIELD[kind]] += 1;
  const days = { ...log.days, [key]: day };
  const keys = Object.keys(days).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_DAYS))) delete days[old];
  return { ...log, days, seen: [...log.seen, id].slice(-MAX_SEEN) };
}

export function dayTotal(day: DayActivity | undefined): number {
  return day ? day.doubts + day.quiz + day.reviews : 0;
}

/** Questions answered (doubts + quiz turns) on a day — the app's daily study metric. */
export function answeredOn(log: ActivityLog, ts: number): number {
  const day = log.days[dayKey(ts)];
  return day ? day.doubts + day.quiz : 0;
}

/**
 * Consecutive study days ending today. If today has nothing yet but yesterday does,
 * the streak is still alive (the student can keep it going today).
 */
export function studyStreak(log: ActivityLog, now: number): { days: number; activeToday: boolean } {
  const activeToday = dayTotal(log.days[dayKey(now)]) > 0;
  let cursor = activeToday ? now : shiftDay(now, -1);
  let days = 0;
  while (dayTotal(log.days[dayKey(cursor)]) > 0 && days < MAX_DAYS) {
    days += 1;
    cursor = shiftDay(cursor, -1);
  }
  return { days, activeToday };
}

/** Last `n` days (oldest first) with totals for a small bar chart. */
export function lastDays(log: ActivityLog, now: number, n = 7): { key: string; label: string; answered: number; reviews: number; today: boolean }[] {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const ts = shiftDay(now, -i);
    const key = dayKey(ts);
    const day = log.days[key];
    out.push({
      key,
      label: new Date(ts).toLocaleDateString(undefined, { weekday: "narrow" }),
      answered: day ? day.doubts + day.quiz : 0,
      reviews: day?.reviews ?? 0,
      today: i === 0,
    });
  }
  return out;
}

/**
 * One-time back-fill from doubts saved before the log existed: each thread's tutor
 * answers count on the day the thread was last updated (the only date stored).
 */
export function seedFromThreads(log: ActivityLog, threads: Thread[]): ActivityLog {
  if (log.seeded) return log;
  let next: ActivityLog = { ...log, seeded: true };
  for (const t of threads) {
    for (const m of t.messages) {
      if (m.role !== "assistant") continue;
      next = addActivity(next, "doubt", `${t.id}:${m.id}`, t.updatedAt);
    }
  }
  return next;
}

export function loadActivity(): ActivityLog {
  if (typeof window === "undefined") return emptyLog();
  try {
    return parseLog(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    return emptyLog();
  }
}

function saveActivity(log: ActivityLog) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(log));
    window.dispatchEvent(new Event("snapsolve:activity"));
  } catch {
    /* Progress is a bonus — a full browser storage must never block studying. */
  }
}

/** Records an activity in this browser (no-op on the server). */
export function recordActivity(kind: ActivityKind, id: string, now = Date.now()) {
  if (typeof window === "undefined") return;
  const log = loadActivity();
  const next = addActivity(log, kind, id, now);
  if (next !== log) saveActivity(next);
}

/** Loads the log, back-filling once from saved doubts. */
export function loadSeededActivity(threads: Thread[]): ActivityLog {
  const log = loadActivity();
  if (log.seeded) return log;
  const next = seedFromThreads(log, threads);
  saveActivity(next);
  return next;
}

export function loadDailyGoal(): number {
  if (typeof window === "undefined") return DEFAULT_DAILY_GOAL;
  const v = Number(window.localStorage.getItem(GOAL_KEY));
  return (GOAL_CHOICES as readonly number[]).includes(v) ? v : DEFAULT_DAILY_GOAL;
}

export function saveDailyGoal(goal: number) {
  if (!(GOAL_CHOICES as readonly number[]).includes(goal)) return;
  try {
    window.localStorage.setItem(GOAL_KEY, String(goal));
    window.dispatchEvent(new Event("snapsolve:activity"));
  } catch {
    /* ignore */
  }
}
