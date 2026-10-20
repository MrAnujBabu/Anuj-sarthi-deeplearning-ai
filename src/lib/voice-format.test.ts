import { describe, expect, it } from "vitest";
import { formatVoiceReply } from "./voice-format";

const reply = "Hmm, chook gaye. Sahi jawab option C hai — Alstonia. Whorled mein teen leaves hoti hain. Chalo, agla prashn, number teen. Example kaun sa hai? Option A: China rose. B: Calotropis. C: Alstonia. D: Mustard. Ab batao answer?";

describe("voice reply formatting", () => {
  it("bolds the correct answer", () => {
    expect(formatVoiceReply(reply)).toContain("**✅ Sahi jawab: (C) — Alstonia**");
  });
  it("puts each option A–D on its own list line", () => {
    const out = formatVoiceReply(reply);
    for (const l of ["A", "B", "C", "D"]) expect(out).toMatch(new RegExp(`\\n- \\*\\*\\(${l}\\)\\*\\* `));
  });
  it("separates the next question", () => {
    expect(formatVoiceReply(reply)).toContain("---\n\n**Chalo, agla prashn, number teen.**");
  });
  it("turns Match the Following columns into a table", () => {
    const out = formatVoiceReply("Match karo. Column I: a. Tuber, b. Rhizome, c. Corm, d. Bulb. Column II: i. Ginger, ii. Potato, iii. Onion, iv. Colocasia. Option A: a-ii, b-i, c-iv, d-iii.");
    expect(out).toContain("| Column I | Column II |");
    expect(out).toContain("| a. Tuber | i. Ginger |");
    expect(out).toContain("| d. Bulb | iv. Colocasia |");
  });
});
