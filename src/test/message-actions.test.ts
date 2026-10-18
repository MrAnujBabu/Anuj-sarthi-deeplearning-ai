import { beforeEach, describe, expect, it } from "vitest";
import { getVote, setVote } from "@/components/message-actions";

describe("answer votes", () => {
  beforeEach(() => localStorage.clear());

  it("stores a like per message id", () => {
    setVote("m1", "up");
    expect(getVote("m1")).toBe("up");
    expect(getVote("m2")).toBeNull();
  });

  it("switches between like and unlike", () => {
    setVote("m1", "up");
    setVote("m1", "down");
    expect(getVote("m1")).toBe("down");
  });

  it("clears the vote when toggled off", () => {
    setVote("m1", "up");
    setVote("m1", null);
    expect(getVote("m1")).toBeNull();
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("snapsolve.votes.v1", "not-json");
    expect(getVote("m1")).toBeNull();
  });
});
