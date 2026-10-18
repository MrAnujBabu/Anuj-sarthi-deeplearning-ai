import { describe, expect, it } from "vitest";
import { buildTeacherMemory } from "@/lib/memory-rank";

const row = (title: string, content: string, extra = {}) => ({ title, content, category: "General", subject: "", chapter: "", kind: "note", tracker_type: null, frequency: 1, ...extra });

describe("teacher memory", () => {
  it("puts the item matching the question first", () => {
    const out = buildTeacherMemory([row("Organic tips", "aldehyde"), row("Projectile motion", "range formula")], "projectile range kaise nikale");
    expect(out.indexOf("Projectile")).toBeLessThan(out.indexOf("Organic"));
  });
  it("never exceeds the size cap", () => {
    const out = buildTeacherMemory([row("Big", "x".repeat(50000))], "big", 1000);
    expect(out.length).toBeLessThanOrEqual(1000);
  });
});
