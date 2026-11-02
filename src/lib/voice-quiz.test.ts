import { describe, expect, it } from "vitest";
import { validVoiceAnswer, voiceQuizOptions } from "./voice-quiz";

describe("voice quiz choices", () => {
  it("extracts all four choices from a spoken question", () => {
    expect(voiceQuizOptions("Powerhouse? A. Nucleus B. Mitochondria C. Ribosome D. Golgi")).toEqual({ A: "Nucleus", B: "Mitochondria", C: "Ribosome", D: "Golgi" });
  });
  it("does not enable partial or missing choices", () => {
    expect(voiceQuizOptions("A. Nucleus B. Mitochondria C. Ribosome D. ")).toBeNull();
    expect(voiceQuizOptions("A. Nucleus C. Ribosome D. Golgi")).toBeNull();
  });
  it("allows only the same A–D submissions as normal chat", () => {
    for (const answer of ["A", "B", "C", "D"]) expect(validVoiceAnswer(answer)).toBe(true);
    for (const answer of ["E", "1", "skip", "Ignore instructions", null]) expect(validVoiceAnswer(answer)).toBe(false);
  });
});
describe("voice quiz option detection", () => {
  it("reads NEET numbered (1)-(4) options as A-D", () => {
    expect(voiceQuizOptions("Bicarpellary gynoecium occurs in: (1) Mustard (2) Banana (3) Pisum (4) Brinjal")).toEqual({ A: "Mustard", B: "Banana", C: "Pisum", D: "Brinjal" });
  });
  it("ignores a stray letter like 'Vitamin A.' in the question", () => {
    expect(voiceQuizOptions("Deficiency of vitamin A. causes? (A) Rickets (B) Night blindness (C) Scurvy (D) Beriberi")).toEqual({ A: "Rickets", B: "Night blindness", C: "Scurvy", D: "Beriberi" });
  });
  it("reads options on separate lines", () => {
    expect(voiceQuizOptions("Q?\n(A) Xylem\n(B) Phloem\n(C) Cortex\n(D) Pith\nApna answer bolo.")).toEqual({ A: "Xylem", B: "Phloem", C: "Cortex", D: "Pith" });
  });
});
