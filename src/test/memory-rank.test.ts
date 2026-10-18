import { describe, expect, it } from "vitest";
import { buildTeacherMemory } from "@/lib/memory-rank";
import imported from "../../data/imported-pcb.json";

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
  it("does not fill the prompt with unrelated chapter outlines", () => {
    const out = buildTeacherMemory([
      row("Projectile motion", "Range and velocity", { chapter: "Motion in a Plane", category: "Syllabus" }),
      row("Plant Kingdom", "Algae and bryophytes", { chapter: "Plant Kingdom", category: "Syllabus" }),
    ], "projectile velocity");
    expect(out).toContain("Projectile motion");
    expect(out).not.toContain("Plant Kingdom");
  });
  it("retains each of the 84 imported chapters when that chapter is requested", () => {
    const rows = Object.entries(imported).flatMap(([branch, chapters]) => Object.entries(chapters).map(([chapter, lines]) =>
      row(`${branch} · ${chapter}`, lines.join("\n"), { category: "Syllabus", subject: ["Botany", "Zoology"].includes(branch) ? "Biology" : branch, chapter })
    ));
    expect(rows).toHaveLength(84);
    expect(rows.filter(r => r.subject === "Physics")).toHaveLength(27);
    expect(rows.filter(r => r.subject === "Chemistry")).toHaveLength(25);
    expect(rows.filter(r => r.subject === "Biology")).toHaveLength(32);
    for (const r of rows) {
      expect(buildTeacherMemory(rows, r.title, 3000)).toContain(`### ${r.title} [`);
    }
  });
});
