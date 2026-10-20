/**
 * Turn a spoken tutor reply (one long run-on paragraph) into readable markdown:
 * verdict in bold, the next question on its own line, options as a list, and
 * the explanation split into short paragraphs. Display only — speech is unchanged.
 */
export function formatVoiceReply(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  if (!t) return t;

  t = matchTable(t);

  // Options spoken as "Option A: X. B: Y. C: Z. D: W." → one list line each.
  t = t.replace(/\s*(?:Option\s+)?\(?([A-D])\)?\s*[:)]\s+(?=\S)/g, (m, l: string, off: number, s: string) => {
    const before = s.slice(Math.max(0, off - 2), off);
    return /[.?!:]\s?$|^$/.test(before) || off === 0 ? `\n- **(${l})** ` : m;
  });

  // Verdict / answer line in bold.
  t = t.replace(/(Sahi jawab|Correct answer|Right answer|Answer)\s+(?:option\s+)?\(?([A-D])\)?\s*(?:hai)?\s*[—–-]?\s*([^.\n]*)/i, (_m, a: string, l: string, rest: string) =>
    `**✅ ${a}: (${l})${rest ? ` — ${rest.trim()}` : ""}**`);

  // Next question on its own block.
  t = t.replace(/\s*((?:Chalo,?\s*)?(?:agla|next)\s+(?:prashn|question|sawal)[^.?!]*[.?!]?)\s*/i, "\n\n---\n\n**$1**\n\n");

  // Split remaining long prose into short paragraphs (every 2 sentences), outside list lines.
  return t
    .split("\n")
    .map((line) => {
      if (line.startsWith("- ") || line.startsWith("**") || line === "---" || line.length < 220) return line;
      const sentences = line.match(/[^.?!]+[.?!]+["”]?\s*|[^.?!]+$/g) ?? [line];
      const out: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) out.push(sentences.slice(i, i + 2).join("").trim());
      return out.join("\n\n");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "Column I: a. X, b. Y … Column II: i. P, ii. Q …" → markdown table. */
function matchTable(t: string): string {
  const m = t.match(/Column\s*(?:I|1|one)\s*[:\-]?\s*(.+?)\s*Column\s*(?:II|2|two)\s*[:\-]?\s*(.+?)(?=(?:Options?\b|\(?A\)?\s*[:)])|$)/i);
  if (!m) return t;
  const items = (s: string, re: RegExp) => s.split(re).map((x) => x.replace(/^[\s,.;:]+|[\s,.;]+$/g, "")).filter(Boolean);
  const left = items(m[1] ?? "", /\b\(?[a-d]\)?[.)]\s+/i);
  const right = items(m[2] ?? "", /\b\(?(?:iv|i{1,3})\)?[.)]\s+/i);
  if (left.length < 2 || left.length !== right.length) return t;
  const roman = ["i", "ii", "iii", "iv"];
  const rows = left.map((l, k) => `| ${"abcd"[k]}. ${l} | ${roman[k]}. ${right[k]} |`).join("\n");
  return t.replace(m[0], `\n\n| Column I | Column II |\n|---|---|\n${rows}\n\n`);
}
