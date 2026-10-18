import { describe, expect, it } from "vitest";
import { normalizeMath } from "@/lib/math-format";

describe("Equation delimiter normalization", () => {
  it("keeps equations inside a sentence inline", () => {
    expect(normalizeMath("Using $$F=ma$$, find $$a=4$$."))
      .toBe("Using $F=ma$, find $a=4$.");
  });
  it("accepts inline parentheses delimiters", () => {
    expect(normalizeMath(String.raw`Using \(F=ma\), solve.`)).toBe("Using $F=ma$, solve.");
  });
  it("preserves standalone and multiline display equations", () => {
    const input = "Steps:\n$$F=ma$$\n\n$$\na=\\frac{F}{m}\n$$\nDone.";
    expect(normalizeMath(input)).toBe(input);
  });
  it("does not rewrite code, SVG or incomplete code fences", () => {
    const input = "`$$F=ma$$`\n```svg\n<text>$$x$$</text>\n```\n~~~text\nUsing $$x$$.\n~~~\n```text\nUsing $$y$$.";
    expect(normalizeMath(input)).toBe(input);
  });
  it("preserves currency and unfinished streamed equations", () => {
    expect(normalizeMath("Cost $5; Using $$F=" )).toBe("Cost $5; Using $$F=");
  });
});