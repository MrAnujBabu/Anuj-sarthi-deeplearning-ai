import { describe, expect, it } from "vitest";
import { groupThreads, threadBucket } from "./thread-groups";

const now = new Date(2026, 9, 20, 15, 0).getTime();
const at = (d: number) => new Date(2026, 9, 20 - d, 10, 0).getTime();
const t = (id: string, d: number, text = "") => ({ id, title: id, updatedAt: at(d), messages: [{ id: id + "m", role: "user" as const, parts: [{ type: "text" as const, text }] }] });

describe("chat history groups", () => {
  it("buckets by Today / Yesterday / 7 days", () => {
    expect(threadBucket(at(0), now)).toBe("Today");
    expect(threadBucket(at(1), now)).toBe("Yesterday");
    expect(threadBucket(at(5), now)).toBe("Previous 7 days");
  });
  it("search matches message text, not just title", () => {
    const g = groupThreads([t("a", 0, "mitochondria"), t("b", 1, "photosynthesis")], "photo", now);
    expect(g).toEqual([["Yesterday", [expect.objectContaining({ id: "b" })]]]);
  });
});
