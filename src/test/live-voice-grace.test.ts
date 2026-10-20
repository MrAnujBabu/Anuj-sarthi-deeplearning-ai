import { describe, expect, it } from "vitest";
import { ACK_GRACE_MS, ICE_SERVERS, MEDIA_GRACE_MS } from "@/hooks/use-live-voice";

describe("voice call connection rules", () => {
  it("survives a 15-second network blink before ending the call", () => {
    expect(ACK_GRACE_MS).toBe(15_000);
    expect(MEDIA_GRACE_MS).toBe(15_000);
  });
  it("uses public STUN for phones on mobile data", () => {
    expect(ICE_SERVERS).toEqual([{ urls: "stun:stun.l.google.com:19302" }]);
  });
});
