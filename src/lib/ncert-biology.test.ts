import { describe, expect, it } from "vitest";
import { NCERT_BIOLOGY_CHAPTERS, ncertChapter, takeChapter } from "./ncert-biology";
import { NCERT_BANK, createNcertDeck, ncertDeckPrompt, renderQuestion } from "./ncert-biology-bank";
import { voiceQuizOptions } from "./voice-quiz";
import { formatVoiceReply } from "./voice-format";

describe("NCERT Biology chapters", () => {
  it("has 19 Class 11 and 13 Class 12 chapters with official names", () => {
    expect(NCERT_BIOLOGY_CHAPTERS.filter((c) => c.cls === 11)).toHaveLength(19);
    expect(NCERT_BIOLOGY_CHAPTERS.filter((c) => c.cls === 12)).toHaveLength(13);
    expect(ncertChapter(11, 5)?.name).toBe("Morphology of Flowering Plants");
    expect(ncertChapter(11, 19)?.name).toBe("Chemical Coordination and Integration");
    expect(ncertChapter(12, 5)?.name).toBe("Molecular Basis of Inheritance");
    expect(ncertChapter(12, 13)?.name).toBe("Biodiversity and Conservation");
  });
  it("a spoken chapter name wins over a wrong spoken number", () => {
    const r = takeChapter("Yeh question NCERT Class 12 Biology, Chapter 4, Molecular Basis of Inheritance se hai. DNA mein...");
    expect(r.chapter?.no).toBe(5);
    expect(r.text).toBe("DNA mein...");
  });
});

describe("deep NCERT question bank", () => {
  it("every question belongs to a real chapter and every chapter has questions", () => {
    for (const q of NCERT_BANK) expect(ncertChapter(q.cls, q.ch)).toBeDefined();
    for (const c of NCERT_BIOLOGY_CHAPTERS) expect(NCERT_BANK.some((q) => q.cls === c.cls && q.ch === c.no)).toBe(true);
  });
  it("renders each question with the chapter line, readable A–D options and the right key", () => {
    for (const q of NCERT_BANK) {
      const r = renderQuestion(q);
      expect(r.text.startsWith(`NCERT Class ${q.cls} Biology · Chapter ${q.ch} — `)).toBe(true);
      const labels = voiceQuizOptions(r.text);
      expect(labels, q.id).not.toBeNull();
      expect(labels![r.answer]).toBe(r.answerText);
      if (q.type === "mcq") expect(r.answerText).toBe(q.options[0]);
    }
  });
  it("only Match questions when only Match is on, alternating with Assertion–Reason when both are on", () => {
    const only = createNcertDeck({ matchQ: true, assertionQ: false });
    for (let i = 0; i < 5; i++) { const q = only.next(); expect(q.text).toContain("Column I:"); only.observe(q.text); }
    const both = createNcertDeck({ matchQ: true, assertionQ: true });
    const kinds: string[] = [];
    for (let i = 0; i < 4; i++) { const q = both.next(); kinds.push(q.text.includes("Assertion (A)") ? "ar" : "match"); both.observe(q.text); }
    expect(kinds).toEqual(kinds[0] === "ar" ? ["ar", "match", "ar", "match"] : ["match", "ar", "match", "ar"]);
  });
  it("hands the grading key to the next turn only after the question was actually asked", () => {
    const deck = createNcertDeck({ matchQ: false, assertionQ: false });
    const first = deck.next();
    deck.observe("Namaste! Kaunsa topic padhna hai?");
    expect(deck.pending()).toBeUndefined();
    expect(deck.next().id).toBe(first.id);
    deck.observe(first.text);
    expect(deck.pending()?.id).toBe(first.id);
    const prompt = ncertDeckPrompt(deck.next(), deck.pending());
    expect(prompt).toContain(`Answer key (secret until graded): (${first.answer})`);
    expect(deck.next().id).not.toBe(first.id);
  });
});

describe("chapter shown in the voice transcript", () => {
  it("quiz card shows the official chapter badge", () => {
    const q = renderQuestion(NCERT_BANK.find((x) => x.id === "11-5-match")!);
    const out = formatVoiceReply(q.text, { options: false });
    expect(out).toContain("> 📖 **NCERT Class 11 Biology · Chapter 5 — Morphology of Flowering Plants**");
    expect(out).toContain("| a. Marginal placentation | i. Dianthus |");
  });
  it("grading names the chapter it came from", () => {
    const out = formatVoiceReply("Galat. Sahi jawab option A hai — 30%. Chargaff ke rule se A barabar T hota hai. Yeh NCERT Class 12 Biology, Chapter 5, Molecular Basis of Inheritance se tha.");
    expect(out).toContain("> 📖 **NCERT chapter:** Class 12 Biology · Chapter 5 — Molecular Basis of Inheritance");
    expect(out).toContain("> **✅ Sahi jawab: (A) — 30%**");
  });
});
