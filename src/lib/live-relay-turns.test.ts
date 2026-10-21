import { describe, expect, it } from "vitest";
import { BACKGROUND_GRACE_MS, backgroundHoldExpired, endWithUserTurn } from "./live-relay.server";

describe("screen-off call hold", () => {
  it("holds the call through the grace and ends it only after", () => {
    const at = 1_000_000;
    expect(backgroundHoldExpired(at, at)).toBe(false);
    expect(backgroundHoldExpired(at, at + BACKGROUND_GRACE_MS - 1)).toBe(false);
    expect(backgroundHoldExpired(at, at + BACKGROUND_GRACE_MS)).toBe(true);
  });
  it("never expires when the screen stayed on", () => {
    expect(backgroundHoldExpired(0, Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});

describe("voice backend turns", () => {
  it("adds a user turn when the transcript ends with the voice agent", () => {
    const out = endWithUserTurn([
      { role: "user", content: "Mitochondria kya hai?" },
      { role: "assistant", content: "Ek second, dekhta hoon." },
    ]);
    expect(out.at(-1)?.role).toBe("user");
    expect(out).toHaveLength(3);
  });
  it("leaves a transcript ending with the student unchanged", () => {
    const msgs = [{ role: "user" as const, content: "Hi" }];
    expect(endWithUserTurn(msgs)).toEqual(msgs);
  });
});
