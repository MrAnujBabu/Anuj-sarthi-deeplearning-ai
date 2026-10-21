import { describe, expect, it } from "vitest";
import { PLAYBACK_SPEEDS, clampPlaybackRate } from "@/hooks/use-live-voice";

describe("voice playback speed", () => {
  it("offers the revision speed choices including 1.25×", () => {
    expect([...PLAYBACK_SPEEDS]).toEqual([0.75, 1, 1.25, 1.5, 1.75, 2]);
  });
  it("clamps extreme rates to the clear-speech range", () => {
    expect(clampPlaybackRate(0.1)).toBe(0.5);
    expect(clampPlaybackRate(5)).toBe(3);
    expect(clampPlaybackRate(1.25)).toBe(1.25);
  });
  it("falls back to normal speed for invalid input", () => {
    expect(clampPlaybackRate(Number.NaN)).toBe(1);
  });
});
