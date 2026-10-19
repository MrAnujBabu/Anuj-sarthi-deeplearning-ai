import { describe, expect, it } from "vitest";
import { endWithUserTurn } from "./live-relay.server";

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
