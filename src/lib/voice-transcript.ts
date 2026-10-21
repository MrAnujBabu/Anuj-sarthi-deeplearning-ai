import { formatVoiceReply } from "@/lib/voice-format";

export type VoiceRow = { id: string; role: "user" | "assistant"; text: string };
/** One quiz question as the tutor wrote it, its A–D options and the student's tapped answer. */
export type VoiceQuizEntry = { id: string; text: string; labels: Record<string, string>; answer?: string; answerRowId?: string };
export type VoiceSession = { rows: VoiceRow[]; quiz: VoiceQuizEntry[] };

const LETTERS = ["A", "B", "C", "D"] as const;
const DATA_MARK = "snapsolve-voice-data:";

/** "Sahi jawab (B) hai", "Correct answer is C" → "B". Null when the reply names no answer. */
export function quizVerdict(text: string): string | null {
  const re = /(?:sahi\s+(?:jawab|answer|option)|correct\s+(?:answer|option)|right\s+answer|सही\s+(?:जवाब|उत्तर))\s*(?:hai|is|:|—|-)?\s*(?:option\s+)?(\()?([a-d])(\))?(?![a-z])/gi;
  for (const m of text.matchAll(re)) {
    // A bare lowercase letter is Hinglish ("sahi jawab a gaya"), not an option.
    if (m[1] || m[3] || /[A-D]/.test(m[2] ?? "")) return (m[2] ?? "").toUpperCase();
  }
  return null;
}

export type QuizResult = { entry: VoiceQuizEntry; correct: string | null; status: "right" | "wrong" | "skipped" | "unanswered" | "unchecked" };

/** Grade each answered question from the tutor's next spoken reply; unknown verdicts stay unchecked (never guessed). */
export function quizResults(rows: VoiceRow[], quiz: VoiceQuizEntry[]): QuizResult[] {
  return quiz.map((entry) => {
    if (!entry.answer) return { entry, correct: null, status: "unanswered" };
    const at = rows.findIndex((r) => r.id === entry.answerRowId);
    const reply = at >= 0 ? rows.slice(at + 1).filter((r) => r.role === "assistant").slice(0, 2).map((r) => r.text).join(" ") : "";
    const correct = quizVerdict(reply);
    if (entry.answer === "skip") return { entry, correct, status: "skipped" };
    if (!correct) return { entry, correct, status: "unchecked" };
    return { entry, correct, status: correct === entry.answer ? "right" : "wrong" };
  });
}

/** The question part of a tutor quiz reply (the previous answer's grading is dropped). */
function questionStem(text: string): string {
  const formatted = formatVoiceReply(text, { options: false });
  const at = formatted.lastIndexOf("#### ❓");
  const part = at >= 0 ? formatted.slice(at).replace(/^#### ❓[^\n]*\n*/, "") : formatted;
  return part.replace(/^---\s*$/gm, "").trim();
}

const cell = (s: string) => s.replace(/\s*\n+\s*/g, " ").replace(/\|/g, "∣").trim();

function quizSection(rows: VoiceRow[], quiz: VoiceQuizEntry[]): string {
  const results = quizResults(rows, quiz);
  const checked = results.filter((r) => r.status === "right" || r.status === "wrong");
  const right = checked.filter((r) => r.status === "right").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const score = checked.length ? ` · Score ${right}/${checked.length}` : "";
  const out = [`## 📝 Quiz — ${quiz.length} sawal${score}${skipped ? ` · ${skipped} skip` : ""}`];
  results.forEach(({ entry, correct, status }, i) => {
    out.push(`### Q${i + 1}`);
    const stem = questionStem(entry.text);
    if (stem) out.push(stem);
    const rowsMd = LETTERS.filter((l) => entry.labels[l]).map((l) => {
      const marks = [l === correct ? "✅ Sahi jawab" : "", l === entry.answer ? (status === "wrong" ? "❌ Tumhara jawab" : "👉 Tumhara jawab") : ""].filter(Boolean).join(" · ");
      return `| **${l}** | ${cell(entry.labels[l] ?? "")} | ${marks} |`;
    });
    out.push(`| Option | Answer | Result |\n|---|---|---|\n${rowsMd.join("\n")}`);
    const verdict =
      status === "right" ? `> **🎉 Sahi!** Tumhara jawab (${entry.answer})` :
      status === "wrong" ? `> **❌ Galat** — tumhara jawab (${entry.answer}), sahi jawab (${correct})` :
      status === "skipped" ? `> **⏭️ Skip (time up)**${correct ? ` — sahi jawab (${correct})` : ""}` :
      status === "unchecked" ? `> **Tumhara jawab:** (${entry.answer}) — tutor ka verdict transcript me dekho` :
      "> *Is sawal ka jawab nahi diya gaya.*";
    out.push(verdict);
  });
  return out.join("\n\n");
}

function encodeData(session: VoiceSession): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, ...session }));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function decodeData(text: string): VoiceSession | null {
  const m = text.match(new RegExp(`<!--\\s*${DATA_MARK}([A-Za-z0-9+/=]+)\\s*-->`));
  if (!m?.[1]) return null;
  try {
    const binary = atob(m[1]);
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))) as Partial<VoiceSession>;
    return { rows: cleanRows(data.rows), quiz: cleanQuiz(data.quiz) };
  } catch {
    return null;
  }
}

function cleanRows(raw: unknown): VoiceRow[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((r): r is VoiceRow => !!r && (r.role === "user" || r.role === "assistant") && typeof r.text === "string")
    .map((r) => ({ id: typeof r.id === "string" && r.id ? r.id : crypto.randomUUID(), role: r.role, text: r.text }));
}

function cleanQuiz(raw: unknown): VoiceQuizEntry[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((q): q is VoiceQuizEntry => !!q && typeof q.id === "string" && typeof q.text === "string" && !!q.labels && typeof q.labels === "object")
    .map((q) => ({
      id: q.id,
      text: q.text,
      labels: Object.fromEntries(LETTERS.filter((l) => typeof q.labels[l] === "string").map((l) => [l, q.labels[l] as string])),
      ...(typeof q.answer === "string" && (q.answer === "skip" || (LETTERS as readonly string[]).includes(q.answer)) ? { answer: q.answer } : {}),
      ...(typeof q.answerRowId === "string" ? { answerRowId: q.answerRowId } : {}),
    }));
}

/** Emoji labels the voice formatter puts on blockquotes, mapped to Obsidian callout types. */
const CALLOUT_TYPES: Record<string, string> = { "🎉": "success", "✅": "success", "❌": "failure", "💡": "tip", "📘": "note", "⚠️": "warning", "⏭️": "quote" };

/**
 * Rewrite the export's markdown so Obsidian renders it natively:
 * `<details>` toggles become foldable callouts (`> [!note]- Title`) and emoji
 * blockquote labels become typed callouts (`> [!success]`, `> [!tip]`, …).
 * Display pipelines and Word/PDF exports keep the original style.
 */
export function toObsidianMarkdown(md: string): string {
  const folded = md.replace(/<details>\n<summary>([^\n]*)<\/summary>\n\n([\s\S]*?)\n+<\/details>/g, (_m, summary: string, body: string) => {
    const quoted = body.split("\n").map((l) => (l.trim() ? `> ${l}` : ">")).join("\n");
    return `> [!note]- ${summary.trim()}\n${quoted}`;
  });
  return folded
    .split("\n")
    .map((line) => {
      const m = line.match(/^> \*\*((?:🎉|✅|❌|💡|📘|⚠️|⏭️)[^*]*)\*\*\s*(.*)$/u);
      if (!m) return line;
      const label = m[1] ?? "";
      const type = Object.keys(CALLOUT_TYPES).find((e) => label.startsWith(e));
      if (!type) return line;
      const rest = (m[2] ?? "").trim();
      return `> [!${CALLOUT_TYPES[type]}] ${label.trim()}${rest ? `\n> ${rest}` : ""}`;
    })
    .join("\n");
}

/**
 * Revision notes for a voice call: quiz questions with every A–D option, the
 * student's answer and the tutor's verdict, then the conversation with the
 * same structure the screen shows (lists, tables, callouts, toggles).
 * `embedData` adds a hidden copy of the raw call so a later import is lossless;
 * Word/PDF exports leave it out. `style: "obsidian"` (default) emits
 * Obsidian-native callouts and folds; `"plain"` keeps the screen style for
 * Word/PDF conversion.
 */
export function voiceTranscriptMarkdown(rows: VoiceRow[], quiz: VoiceQuizEntry[] = [], options: { embedData?: boolean; date?: Date; style?: "obsidian" | "plain" } = {}) {
  const { embedData = true, date = new Date(), style = "obsidian" } = options;
  const lines = rows.map((r) => (r.role === "user" ? `**Me:** ${r.text.trim()}` : `**SnapSolve:**\n\n${formatVoiceReply(r.text).trim()}`));
  const parts = [`---\ntype: voice-call\ndate: ${date.toISOString()}\ntags: [snapsolve, voice-call]\nquiz_questions: ${quiz.length}\n---`, "# Voice call"];
  if (quiz.length) parts.push(quizSection(rows, quiz), "## 💬 Conversation");
  parts.push(...lines);
  if (embedData) parts.push(`<!-- ${DATA_MARK}${encodeData({ rows, quiz })} -->`);
  const md = `${parts.join("\n\n")}\n`;
  return style === "obsidian" ? toObsidianMarkdown(md) : md;
}

/** Restore a call from a SnapSolve .md export (lossless when it carries its data copy) or a .json backup. */
export function parseVoiceSession(text: string): VoiceSession {
  const embedded = decodeData(text);
  if (embedded) return embedded;
  if (text.trim().startsWith("{")) {
    const data = JSON.parse(text) as { rows?: unknown; quiz?: unknown };
    return { rows: cleanRows(data.rows).map((r) => ({ ...r, id: crypto.randomUUID() })), quiz: cleanQuiz(data.quiz) };
  }
  const rows: VoiceRow[] = [];
  for (const m of text.matchAll(/\*\*(Me|SnapSolve):\*\*\s*([\s\S]*?)(?=\n\n\*\*(?:Me|SnapSolve):\*\*|\n\n<!--|\s*$)/g))
    rows.push({ id: crypto.randomUUID(), role: m[1] === "Me" ? "user" : "assistant", text: (m[2] ?? "").trim() });
  return { rows, quiz: [] };
}

export function parseVoiceTranscript(text: string): VoiceRow[] {
  return parseVoiceSession(text).rows;
}
