import { describe, expect, it } from "vitest";
import { buildTeacherMemory } from "@/lib/memory-rank";
import imported from "../../data/imported-pcb.json";

const row = (title: string, content: string, extra = {}) => ({ title, content, category: "General", subject: "", chapter: "", kind: "note", tracker_type: null, frequency: 1, ...extra });

describe("teacher memory", () => {
  it.each([
    ['missing source', 'Year: 2021\nQuestion: Force on a body?', {}],
    ['missing year', 'Question: Force on a body?', { source_url: 'https://example.org/paper.pdf' }],
    ['missing question', 'Year: 2021\nArchive: Force', { source_url: 'https://example.org/paper.pdf' }],
    ['reference only', 'Year: 2021\nQuestion: Force\nReference only', { source_url: 'https://example.org/paper.pdf' }],
  ])('excludes %s from year tips', (_, content, extra) => {
    expect(buildTeacherMemory([row('Force', content, { kind: 'pyq', ...extra })], 'Force')).toBe('');
  });
  it('preserves source and 2020 year before capped question text', () => {
    const out = buildTeacherMemory([row('Population', 'Question: Population attributes?\n' + 'population '.repeat(5000) + '\nYear: 2020', { kind: 'pyq', source_url: 'https://nta.ac.in/paper.pdf' })], 'population', 2000);
    expect(out).toContain('Year: 2020');
    expect(out).toContain('Source: https://nta.ac.in/paper.pdf');
    expect(out).toContain('Question: Population attributes?');
    expect(out.length).toBeLessThanOrEqual(2000);
  });
  it('includes sourced 2021 questions but excludes unrelated 2017 PYQs', () => {
    const out = buildTeacherMemory([
      row('Force', 'Year: 2021\nQuestion: Force on a body?', { kind: 'pyq', source_url: 'https://example.org/2021.pdf' }),
      row('Algae', 'Year: 2017\nQuestion: Algae?', { kind: 'pyq' }),
    ], 'Force on a body');
    expect(out).toContain('Year: 2021');
    expect(out).toContain('Source: https://example.org/2021.pdf');
    expect(out).not.toContain('2017');
  });
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
