import type { Thread } from "./threads";

const DAY = 86_400_000;

/** Bucket label for a thread relative to `now` (local calendar days). */
export function threadBucket(updatedAt: number, now = Date.now()): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  if (updatedAt >= today) return "Today";
  if (updatedAt >= today - DAY) return "Yesterday";
  if (updatedAt >= today - 7 * DAY) return "Previous 7 days";
  if (updatedAt >= today - 30 * DAY) return "Previous 30 days";
  return new Date(updatedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Groups threads (newest first) into date buckets, optionally filtered by title/content. */
export function groupThreads(threads: Thread[], query = "", now = Date.now()): [string, Thread[]][] {
  const q = query.trim().toLowerCase();
  const out = new Map<string, Thread[]>();
  for (const t of [...threads].sort((a, b) => b.updatedAt - a.updatedAt)) {
    if (q) {
      const body = t.messages.flatMap((m) => m.parts.map((p) => (p.type === "text" ? p.text : ""))).join(" ").toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !body.includes(q)) continue;
    }
    const key = threadBucket(t.updatedAt, now);
    out.set(key, [...(out.get(key) ?? []), t]);
  }
  return [...out.entries()];
}

export function threadMeta(t: Thread): string {
  const n = t.messages.filter((m) => m.role === "user").length;
  const time = new Date(t.updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${n} ${n === 1 ? "question" : "questions"} · ${time}`;
}
