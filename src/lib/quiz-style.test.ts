// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseCallPrefs, quizStyle } from "./live-relay.server";

describe("voice quiz question styles", () => {
  it("defaults all style toggles off", () => {
    const p = parseCallPrefs({ quiz: true });
    expect([p.matchQ, p.assertionQ, p.deep]).toEqual([false, false, false]);
    expect(quizStyle(p)).toBe("");
  });
  it("Match + Assertion alternate only those types", () => {
    const s = quizStyle(parseCallPrefs({ matchQ: true, assertionQ: true }));
    expect(s).toContain("ONLY these NEET question types, alternating: Match the Following and Assertion–Reason");
  });
  it("deep mode uses NCERT Biology", () => {
    expect(quizStyle(parseCallPrefs({ deep: true }))).toContain("NCERT Class 11/12 Biology");
  });
});
