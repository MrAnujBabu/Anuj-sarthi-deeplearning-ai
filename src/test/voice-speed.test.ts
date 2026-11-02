import { describe, expect, it } from "vitest";
import { VOICE_SPEEDS, paceInstruction, paceUpdate, voiceSpeed } from "@/lib/voice-speed";

describe("tutor speaking speed", () => {
  it("accepts only the offered speeds from a browser", () => {
    expect(voiceSpeed(1.25)).toBe(1.25);
    expect(voiceSpeed(2)).toBe(2);
    expect(voiceSpeed(3)).toBeNull();
    expect(voiceSpeed("1.5")).toBeNull();
    expect(voiceSpeed(Number.NaN)).toBeNull();
  });
  it("tells the tutor the chosen pace at call start", () => {
    expect(paceInstruction(1.25)).toContain("1.25x");
    expect(paceInstruction(0.75)).toContain("slowly");
  });
  it("fits every mid-call speed update inside one 480-byte instruction", () => {
    for (const speed of VOICE_SPEEDS) {
      expect(new TextEncoder().encode(paceUpdate(speed)).length).toBeLessThanOrEqual(480);
      expect(paceUpdate(speed)).toContain(`${speed}x`);
    }
  });
});
