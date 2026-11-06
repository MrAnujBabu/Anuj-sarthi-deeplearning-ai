import { describe, expect, it } from "vitest";
import { addActivity, answeredOn, dayKey, emptyLog, lastDays, parseLog, seedFromThreads, studyStreak } from "@/lib/study-stats";
import type { Thread } from "@/lib/threads";

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime();

describe("study stats", () => {
  it("counts the same answer only once", () => {
    let log = emptyLog();
    log = addActivity(log, "doubt", "m1", at(2026, 11, 6));
    log = addActivity(log, "doubt", "m1", at(2026, 11, 6, 15));
    expect(answeredOn(log, at(2026, 11, 6))).toBe(1);
  });

  it("counts doubts and quiz turns as answered, but not card reviews", () => {
    let log = emptyLog();
    log = addActivity(log, "doubt", "a", at(2026, 11, 6));
    log = addActivity(log, "quiz", "b", at(2026, 11, 6));
    log = addActivity(log, "review", "c", at(2026, 11, 6));
    expect(answeredOn(log, at(2026, 11, 6))).toBe(2);
    expect(log.days[dayKey(at(2026, 11, 6))]?.reviews).toBe(1);
  });

  it("streak counts consecutive days and stays alive when only yesterday has study", () => {
    let log = emptyLog();
    log = addActivity(log, "doubt", "d3", at(2026, 11, 3));
    log = addActivity(log, "doubt", "d4", at(2026, 11, 4));
    log = addActivity(log, "review", "d5", at(2026, 11, 5));
    expect(studyStreak(log, at(2026, 11, 6))).toEqual({ days: 3, activeToday: false });
    log = addActivity(log, "quiz", "d6", at(2026, 11, 6));
    expect(studyStreak(log, at(2026, 11, 6))).toEqual({ days: 4, activeToday: true });
  });

  it("a missed day breaks the streak", () => {
    let log = emptyLog();
    log = addActivity(log, "doubt", "d3", at(2026, 11, 3));
    log = addActivity(log, "doubt", "d6", at(2026, 11, 6));
    expect(studyStreak(log, at(2026, 11, 6)).days).toBe(1);
    expect(studyStreak(log, at(2026, 11, 8)).days).toBe(0);
  });

  it("last 7 days ends today", () => {
    const log = addActivity(emptyLog(), "doubt", "x", at(2026, 11, 6));
    const days = lastDays(log, at(2026, 11, 6));
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ key: "2026-11-06", answered: 1, today: true });
    expect(days[0]?.key).toBe("2026-10-31");
  });

  it("back-fills once from saved doubts", () => {
    const thread = {
      id: "t1",
      title: "Cell",
      updatedAt: at(2026, 11, 5),
      messages: [
        { id: "u1", role: "user", parts: [] },
        { id: "a1", role: "assistant", parts: [] },
        { id: "u2", role: "user", parts: [] },
        { id: "a2", role: "assistant", parts: [] },
      ],
    } as unknown as Thread;
    const seeded = seedFromThreads(emptyLog(), [thread]);
    expect(answeredOn(seeded, at(2026, 11, 5))).toBe(2);
    expect(seedFromThreads(seeded, [thread])).toBe(seeded);
  });

  it("ignores damaged stored data", () => {
    expect(parseLog({ days: { bad: { doubts: 3 }, "2026-11-06": { doubts: -2, quiz: "x", reviews: 4 } }, seen: [1, "a"] })).toEqual({
      days: { "2026-11-06": { doubts: 0, quiz: 0, reviews: 4 } },
      seen: ["a"],
    });
  });
});
