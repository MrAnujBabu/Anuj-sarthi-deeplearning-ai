import { describe, expect, it } from "vitest";
import { extractQuizOptions } from "./quiz-options";
import { parseQuizTag } from "./srs";

describe("PDF-style numbered quiz options", () => {
  it('hidden graded cards never supply old answer options', () => {
    const text = 'Correct!\n<!--card {"q":"Old? (A) oldA (B) oldB (C) oldC (D) oldD","a":"B","correct":true}-->';
    expect(extractQuizOptions(text, ['A','B','C','D']).labels).toEqual({});
    expect(extractQuizOptions(text + '\nNext?\n(A) newA\n(B) newB\n(C) newC\n(D) newD', ['A','B','C','D']).labels).toEqual({ A:'newA', B:'newB', C:'newC', D:'newD' });
  });
  const q = "**Q4.** (PDF Page 2, Q40) **Bicarpellary** gynoecium and false septum in ovary occurs in: (1) Mustard (2) Banana (3) Pisum (4) Brinjal";

  it("maps numbered quiz tag options to A–D", () => {
    expect(parseQuizTag(`${q}\n<!--quiz {"options":["1","2","3","4"]}-->`)).toEqual(["A", "B", "C", "D"]);
  });

  it("shows option text on the cards for inline (1)…(4) options", () => {
    const r = extractQuizOptions(q, ["A", "B", "C", "D"]);
    expect(r.labels).toEqual({ A: "Mustard", B: "Banana", C: "Pisum", D: "Brinjal" });
    expect(r.text).toContain("occurs in:");
    expect(r.text).not.toContain("Brinjal");
  });

  it("still reads letter options on separate lines", () => {
    const r = extractQuizOptions("Q1. Site of respiration?\n(A) Mitochondria\n(B) Chloroplast\n(C) Ribosome\n(D) Golgi", ["A", "B", "C", "D"]);
    expect(r.labels['A']).toBe("Mitochondria");
    expect(r.labels['D']).toBe("Golgi");
  });
});
