import { describe, expect, it } from "vitest";
import { ACK_GRACE_MS, ICE_MAX_MS, ICE_SERVERS, ICE_SETTLE_MS, MEDIA_GRACE_MS, iceOfferReady } from "@/hooks/use-live-voice";

describe("voice call connection rules", () => {
  it("survives a 15-second network blink before ending the call", () => {
    expect(ACK_GRACE_MS).toBe(15_000);
    expect(MEDIA_GRACE_MS).toBe(15_000);
  });
  it("uses public STUN for phones on mobile data", () => {
    expect(ICE_SERVERS).toEqual([{ urls: "stun:stun.l.google.com:19302" }]);
  });
});

describe("fast call start: when the network offer is sent", () => {
  it("sends at once when a public (STUN) address is found", () => {
    expect(iceOfferReady({ elapsedMs: 120, types: ["host", "srflx"], complete: false })).toBe(true);
  });
  it("sends with local addresses only after 0.8 s of waiting", () => {
    expect(ICE_SETTLE_MS).toBe(800);
    expect(iceOfferReady({ elapsedMs: 300, types: ["host"], complete: false })).toBe(false);
    expect(iceOfferReady({ elapsedMs: 800, types: ["host"], complete: false })).toBe(true);
  });
  it("never sends an offer with no address before gathering ends", () => {
    expect(iceOfferReady({ elapsedMs: 2_000, types: [], complete: false })).toBe(false);
    expect(iceOfferReady({ elapsedMs: 50, types: [], complete: true })).toBe(true);
  });
  it("gives up waiting after 3 seconds at most", () => {
    expect(ICE_MAX_MS).toBe(3_000);
  });
});
