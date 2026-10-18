import { describe, expect, it } from "vitest";
import { applyResults, cardId, dueCards, parseCards, schedule, stripCards } from "@/lib/srs";

const DAY = 86400000;

describe("spaced repetition", () => {
  it("first correct answer comes back after 1 day", () => {
    expect(schedule(undefined, true, 0)).toEqual({ box: 1, due: DAY });
  });
  it("correct in box 2 moves to box 3 (7 days)", () => {
    expect(schedule(2, true, 0)).toEqual({ box: 3, due: 7 * DAY });
  });
  it("wrong answer resets to box 1 (tomorrow)", () => {
    expect(schedule(4, false, 0)).toEqual({ box: 1, due: DAY });
  });
  it("box 5 stays at 30 days", () => {
    expect(schedule(5, true, 0).due).toBe(30 * DAY);
  });
  it("parses and hides card tags", () => {
    const t = 'Correct!\n<!--card {"q":"What is F?","a":"ma","correct":true}-->';
    expect(parseCards(t)).toHaveLength(1);
    expect(stripCards(t).trim()).toBe("Correct!");
  });
  it("updates an existing card by id and makes it due", () => {
    const cards = applyResults([], [{ q: "Q1", a: "B", correct: false }], 0);
    const next = applyResults(cards, [{ id: cardId("Q1"), q: "rephrased", a: "B", correct: true }], DAY);
    expect(next).toHaveLength(1);
    expect(next[0]!.box).toBe(2);
    expect(dueCards(cards, DAY)).toHaveLength(1);
  });
});

describe("quiz option tag", async () => {
  const { parseQuizTag, stripCards } = await import("@/lib/srs");
  it("reads A-D options from the last tag", () => {
    expect(parseQuizTag('Q1 ...\n<!--quiz {"options":["A","B","C","D"]}-->')).toEqual(["A", "B", "C", "D"]);
  });
  it("returns null when no question is open", () => {
    expect(parseQuizTag("Final score 3/5")).toBeNull();
  });
  it("hides the tag, even half-streamed", () => {
    expect(stripCards('Q1\n<!--quiz {"opt').trim()).toBe("Q1");
    expect(stripCards("Q1\n<!-").trim()).toBe("Q1");
  });
});

describe("MCQ option layout", async () => {
  const { splitOptions } = await import("@/components/assistant-answer");
  it("puts each option on its own line", () => {
    expect(splitOptions("(A) one (B) two (C) three (D) four")).toBe("(A) one  \n(B) two  \n(C) three  \n(D) four");
  });
});
