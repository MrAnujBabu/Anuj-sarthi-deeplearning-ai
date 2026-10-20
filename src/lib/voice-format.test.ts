import { describe, expect, it } from "vitest";
import { formatVoiceReply } from "./voice-format";

const reply = "Hmm, is baar thoda chook gaye. Sahi jawab option B hai — underground stem. Potato ka tuber ek modified underground stem hota hai. Isko pehchanne ka tareeka yaad rakho: potato par \"eyes\" hote hain. NCERT ke mutabik, ginger, turmeric, zaminkand, aur Colocasia bhi aise hi underground stem modifications hain. Chalo, agla prashn, number teen. Phyllotaxy mein \"whorled\" arrangement ka example kaun sa hai? Option A: China rose. B: Calotropis. C: Alstonia. D: Mustard. Ab batao answer?";

describe("voice reply formatting", () => {
  const out = formatVoiceReply(reply);
  it("drops fillers and shows a wrong-answer heading", () => {
    expect(out.startsWith("#### ❌ Is baar thoda chook gaye")).toBe(true);
  });
  it("highlights the correct answer", () => {
    expect(out).toContain("> **✅ Sahi jawab: (B) — underground stem**");
  });
  it("puts the explanation in bullets with NCERT and tip callouts", () => {
    expect(out).toContain("#### 📘 Explanation");
    expect(out).toContain("- Potato ka tuber ek modified underground stem hota hai.");
    expect(out).toContain("> 💡 **Yaad rakho:**");
    expect(out).toContain("> 📚 **NCERT:**");
  });
  it("starts the next question as a numbered card with options A–D", () => {
    expect(out).toContain("---\n\n#### ❓ Question 3");
    expect(out).toContain("**Phyllotaxy mein \"whorled\" arrangement ka example kaun sa hai?**");
    for (const [l, v] of [["A", "China rose"], ["B", "Calotropis"], ["C", "Alstonia"], ["D", "Mustard"]]) expect(out).toContain(`- **(${l})** ${v}\n`.trimEnd());
    expect(out).toContain("*🎤 Ab batao answer?*");
  });
  it("turns Match the Following columns into a table", () => {
    const m = formatVoiceReply("Match karo. Column I: a. Tuber, b. Rhizome, c. Corm, d. Bulb. Column II: i. Ginger, ii. Potato, iii. Onion, iv. Colocasia. Option A: a-ii, b-i, c-iv, d-iii. B: a-i, b-ii, c-iii, d-iv.");
    expect(m).toContain("| Column I | Column II |");
    expect(m).toContain("| a. Tuber | i. Ginger |");
    expect(m).toContain("| d. Bulb | iv. Colocasia |");
    expect(m).toContain("- **(A)** a-ii, b-i, c-iv, d-iii");
  });
  it("keeps a mention of the next question as plain text when no options follow", () => {
    const o = formatVoiceReply("Pehla sawaal abhi pending hai. Kya use dobara sunna hai? Ya skip karke agla sawal sunoge?");
    expect(o).not.toContain("❓");
    expect(o).toContain("Ya skip karke agla sawal sunoge?");
  });
  it("reads options spoken with commas", () => {
    const o = formatVoiceReply("Nahi, A galat hai. Sahi jawab C hai, triploid. Agla sawaal, exine kis padarth se bani hai? A, cellulose, B, pectin, C, lignin, D, sporopollenin. Kya lagta hai?");
    expect(o).toContain("> **✅ Sahi jawab: (C) — triploid**");
    expect(o).toContain("#### ❓ Agla sawal");
    expect(o).toContain("- **(D)** sporopollenin");
    expect(o).toContain("*🎤 Kya lagta hai?*");
  });
  it("formats a quiz card with unseparated columns and (A) options", () => {
    const o = formatVoiceReply("Mm. Sahi match karo. Column I: a. Rhizome b. Tuber c. Bulb d. Corm Column II: i. Potato ii. Ginger iii. Colocasia iv. Onion\n(A) a-ii, b-i, c-iv, d-iii\n(B) a-i, b-ii, c-iii, d-iv\n(C) a-ii, b-iii, c-iv, d-i\n(D) a-iii, b-i, c-ii, d-iv Apna answer bolo, A, B, C ya D");
    expect(o).toContain("| a. Rhizome | i. Potato |");
    expect(o).toContain("| d. Corm | iv. Onion |");
    expect(o).toContain("- **(B)** a-i, b-ii, c-iii, d-iv");
    expect(o).not.toContain("Mm.");
    const card = formatVoiceReply("Column I: a. Rhizome b. Tuber Column II: i. Potato ii. Ginger (A) a-ii, b-i (B) a-i, b-ii (C) x (D) y", { options: false });
    expect(card).toContain("| b. Tuber | ii. Ginger |");
    expect(card).not.toContain("**(A)**");
  });
  it("keeps a half-spoken Match column in one paragraph", () => {
    expect(formatVoiceReply("Sahi match karo. Column I: a. Rhizome, b. Tuber, c. Bulb, d. Corm.")).not.toContain("a.\n");
  });
  it("boxes Assertion and Reason", () => {
    const a = formatVoiceReply("Assertion: Potato is a stem. Reason: It has nodes. Option A: Both true. B: A true, R false. C: A false. D: Both false.");
    expect(a).toContain("> **Assertion (A):** Potato is a stem.");
    expect(a).toContain("> **Reason (R):** It has nodes.");
    const b = formatVoiceReply("Assertion (A): Potato is a stem. Reason (R): It has nodes. (A) Both true (B) A true, R false (C) A false (D) Both false");
    expect(b).toContain("> **Assertion (A):** Potato is a stem.");
    expect(b).toContain("- **(C)** A false");
  });
});
