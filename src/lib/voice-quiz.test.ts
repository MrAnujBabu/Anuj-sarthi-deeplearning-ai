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