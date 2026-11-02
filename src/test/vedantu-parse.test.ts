import { describe, expect, it } from "vitest";
import { parseBatches } from "@/lib/vedantu/parse";

const course = { batchId: "b1", courseId: "c1", subjectName: "Biology", title: "Bio batch" };

describe("parseBatches", () => {
  it("reads the plain { courses } shape", () => {
    expect(parseBatches({ courses: [course] })).toEqual([
      { batchId: "b1", courseId: "c1", subject: "Biology", title: "Bio batch" },
    ]);
  });

  it("reads wrapped shapes (data.courses, data array, result.courses, bare array)", () => {
    const expected = [{ batchId: "b1", courseId: "c1", subject: "Biology", title: "Bio batch" }];
    expect(parseBatches({ data: { courses: [course] } })).toEqual(expected);
    expect(parseBatches({ data: [course] })).toEqual(expected);
    expect(parseBatches({ result: { courses: [course] } })).toEqual(expected);
    expect(parseBatches([course])).toEqual(expected);
  });

  it("returns [] for empty or unknown shapes without throwing", () => {
    expect(parseBatches(null)).toEqual([]);
    expect(parseBatches({})).toEqual([]);
    expect(parseBatches({ courses: [] })).toEqual([]);
  });

  it("dedupes batchIds and skips entries without a batchId", () => {
    const rows = parseBatches({ courses: [course, course, { courseId: "c2" }] });
    expect(rows).toHaveLength(1);
  });
});
