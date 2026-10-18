import { describe, expect, it } from "vitest";

import DOMPurify from "dompurify";

import { SVG_SANITIZE_CONFIG, isRenderableSvg, splitDiagrams } from "@/lib/diagrams";

describe("Diagrams drawn inside an answer", () => {
  it("keeps a plain answer as one readable text segment", () => {
    const answer = "**Answer: (B) 4 m/s²**\n\nNCERT Class 11, Ch 5.";
    expect(splitDiagrams(answer)).toEqual([{ kind: "text", text: answer }]);
  });

  it("pulls a finished drawing out of the answer as a picture", () => {
    const answer = "Concept here.\n```svg\n<svg viewBox=\"0 0 10 10\"><line/></svg>\n```\nNow the steps.";
    const parts = splitDiagrams(answer);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toEqual({ kind: "text", text: "Concept here.\n" });
    expect(parts[1]).toMatchObject({ kind: "diagram", complete: true });
    expect(parts[1]).toHaveProperty("svg", '<svg viewBox="0 0 10 10"><line/></svg>\n');
    expect(parts[2]).toEqual({ kind: "text", text: "\nNow the steps." });
  });

  it("shows a waiting note, not raw markup, while the drawing is still arriving", () => {
    const parts = splitDiagrams("See this:\n```svg\n<svg viewBox=\"0 0 9 9\"><rect");
    expect(parts[1]).toMatchObject({ kind: "diagram", complete: false });
    expect(parts.some((p) => p.kind === "text" && p.text.includes("<svg"))).toBe(false);
  });

  it("refuses to draw anything that is not a real svg element", () => {
    expect(isRenderableSvg('<script>alert("x")</script>')).toBe(false);
    expect(isRenderableSvg("<svg viewBox='0 0 2 2'></svg>")).toBe(true);
  });
});

describe("Cleaning a drawing before it reaches the page", () => {
  const clean = (s: string) => DOMPurify.sanitize(s, SVG_SANITIZE_CONFIG);

  it("keeps every coordinate, arrow and label the drawing needs", () => {
    const out = clean(
      '<svg viewBox="0 0 400 260"><polygon points="40,220 360,220" stroke="#1f2937"/><line x1="0" y1="-20" x2="0" y2="-70" marker-end="url(#arrow)"/><text x="105" y="205" font-size="14">30</text></svg>',
    );
    expect(out).toContain('viewBox="0 0 400 260"');
    expect(out).toContain('points="40,220 360,220"');
    expect(out).toContain('x2="0"');
    expect(out).toContain('marker-end="url(#arrow)"');
    expect(out).toContain('font-size="14"');
    expect(out).toContain(">30</text>");
  });

  it("throws away scripts, embedded styles and anything pointing at another site", () => {
    const out = clean(
      '<svg><script>alert(1)</script><style>svg{fill:red}</style><image href="https://evil.example/a.png"/><a href="https://evil.example">x</a><use xlink:href="https://evil.example/x.svg#y"/></svg>',
    );
    expect(out).not.toContain("evil.example");
    expect(out).not.toContain("fill:red");
    expect(out.toLowerCase()).not.toContain("script");
  });
});
