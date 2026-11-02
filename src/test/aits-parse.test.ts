import { describe, expect, it } from "vitest";
import { aitsDateIso, parseAitsSchedule, summarizeAits } from "@/lib/vedantu/sheets.server";

const ROW = (done: string, no: number, name: string, type: string, date: string, time: string, syllabus: string, extra: unknown[] = []) => [
  done, String(no), name, type, date, "Sun", time, syllabus, ...extra,
];

describe("aitsDateIso", () => {
  it("parses sheet date + time into IST ISO", () => {
    expect(aitsDateIso("Sun, 26 Jul 2026", "9:00 AM")).toBe("2026-07-26T03:30:00");
    expect(aitsDateIso("Sun, 01 Nov 2026", "2:00 PM")).toBe("2026-11-01T08:30:00");
  });
  it("defaults to 9 AM when time missing and rejects junk", () => {
    expect(aitsDateIso("Sun, 26 Jul 2026", "")).toBe("2026-07-26T03:30:00");
    expect(aitsDateIso("nahi", "9:00 AM")).toBeNull();
    expect(aitsDateIso(46229, "9:00 AM")).toBeNull();
  });
});

describe("parseAitsSchedule", () => {
  const sheet = {
    values: [
      ["Done", "Test No", "Test Name", "Type", "Date", "Day", "Time", "Syllabus", "Completed On", "Marks /720", "Percentile", "Notes", "Physics", "Chemistry", "Botany", "Zoology"],
      ROW("FALSE", 1, "AITS Part Syllabus 1", "Part Syllabus", "Sun, 26 Jul 2026", "9:00 AM", "PHY: Units | CHEM: Basic", ["", "", "", "", "Units & Measurements", "Basic Concepts", "Living World", ""]),
      ROW("TRUE", 5, "AITS Part Syllabus 5", "Part Syllabus", "Sun, 23 Aug 2026", "9:00 AM", "PHY: Thermal", ["23 Aug 2026 21:43", "512", "98.2"]),
      ["", "", "", ""], // junk row skipped
    ],
  };

  it("parses valid rows and skips junk", () => {
    const tests = parseAitsSchedule(sheet);
    expect(tests).toHaveLength(2);
    expect(tests[0]!).toMatchObject({ testNo: 1, name: "AITS Part Syllabus 1", done: false });
    expect(tests[0]!.subjects).toEqual({ physics: "Units & Measurements", chemistry: "Basic Concepts", botany: "Living World" });
    expect(tests[1]).toMatchObject({ testNo: 5, done: true, marks: 512, percentile: 98.2, completedOn: "23 Aug 2026 21:43" });
  });

  it("returns [] for empty/invalid payloads", () => {
    expect(parseAitsSchedule({})).toEqual([]);
    expect(parseAitsSchedule({ values: [] })).toEqual([]);
  });
});

describe("summarizeAits", () => {
  it("counts done/pending/overdue and picks the next future test", () => {
    const now = new Date("2026-10-23T00:00:00+05:30");
    const tests = parseAitsSchedule({
      values: [
        ["h"],
        ROW("TRUE", 1, "Past done", "Part Syllabus", "Sun, 26 Jul 2026", "9:00 AM", ""),
        ROW("FALSE", 2, "Past missed", "Part Syllabus", "Sun, 02 Aug 2026", "9:00 AM", ""),
        ROW("FALSE", 3, "Next one", "Cumulative", "Sun, 01 Nov 2026", "9:00 AM", ""),
        ROW("FALSE", 4, "Later", "Full CBT", "Sun, 08 Nov 2026", "9:00 AM", ""),
      ],
    });
    const s = summarizeAits(tests, now);
    expect(s.summary).toEqual({ total: 4, done: 1, pending: 3, overdue: 1 });
    expect(s.nextTest?.name).toBe("Next one");
  });
});
