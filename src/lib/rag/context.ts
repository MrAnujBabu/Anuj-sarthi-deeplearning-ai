import { embedQuery } from "./embed.functions";
import { searchPyqs, searchRag } from "./store";
import { detectSubject, expandFollowUp } from "./query";
import { NCERT_BOOKS } from "@/lib/agent/ncert";

const MAX_CONTEXT_CHARS = 2500;

/**
 * Builds an offline context block from the device-stored NCERT library and PYQ bank.
 * Follow-ups borrow the previous question; a clear subject narrows search to that subject's books.
 * Returns "" when the library is empty or nothing matches — the tutor then works as before.
 */
export async function buildRagContext(question: string, previous?: string): Promise<string> {
  const q = expandFollowUp(question.replace(/<[^>]+>/g, " ").slice(0, 1500), previous?.replace(/<[^>]+>/g, " ")).trim();
  if (q.length < 12) return "";
  try {
    const { vector } = await embedQuery({ data: { text: q } });
    const subject = detectSubject(q);
    let chunks = await searchRag(q, vector ?? [], 5, subject ? (c) => c.book.endsWith(subject) : undefined);
    if (!chunks.length && subject) chunks = await searchRag(q, vector ?? [], 5);
    const pyqs = await searchPyqs(q, 3);
    if (!chunks.length && !pyqs.length) return "";

    let out = "";
    if (chunks.length) {
      out += "### NCERT textbook excerpts (student's offline library — quote these first)\n";
      for (const c of chunks) {
        const book = NCERT_BOOKS[c.book]?.label ?? c.book;
        out += `\n[${book}${c.chapter ? `, ${c.chapter}` : ""}, p.${c.page}]\n${c.text}\n`;
      }
    }
    if (pyqs.length) {
      out += "\n### NEET previous-year questions from the student's PYQ bank\n";
      for (const p of pyqs) {
        out += `\n(NEET ${p.year}${p.chapter ? `, ${p.chapter}` : ""}) ${p.question}\n${p.options.map((o, i) => `(${String.fromCharCode(65 + i)}) ${o}`).join(" ")}\nAnswer: ${p.answer}${p.explanation ? ` — ${p.explanation}` : ""}\n`;
      }
    }
    return out.length > MAX_CONTEXT_CHARS ? out.slice(0, MAX_CONTEXT_CHARS) + "…" : out;
  } catch {
    return ""; // Offline or embedding unavailable: chat continues without the library.
  }
}
