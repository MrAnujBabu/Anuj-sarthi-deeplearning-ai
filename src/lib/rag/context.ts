import { embedQuery } from "./embed.functions";
import { searchPyqs, searchRag } from "./store";
import { NCERT_BOOKS } from "@/lib/agent/ncert";

const MAX_CONTEXT_CHARS = 2500;

/**
 * Builds an offline context block from the device-stored NCERT library and PYQ bank.
 * Returns "" when the library is empty or nothing matches — the tutor then works as before.
 */
export async function buildRagContext(question: string): Promise<string> {
  const q = question.replace(/<[^>]+>/g, " ").slice(0, 1500).trim();
  if (q.length < 12) return "";
  try {
    const { vector } = await embedQuery({ data: { text: q } });
    const [chunks, pyqs] = await Promise.all([searchRag(q, vector ?? [], 5), searchPyqs(q, 3)]);
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
