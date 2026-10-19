/**
 * Pull the option text for an open quiz question so the answer cards can show it,
 * and return the question text without those option lines (the cards replace them).
 */
export function extractQuizOptions(text: string, options: string[]): { text: string; labels: Record<string, string> } {
  const labels: Record<string, string> = {};
  const letters = options.map((o) => o.trim().toUpperCase()).filter((o) => /^[A-F]$/.test(o));
  if (!letters.length) return { text, labels };
  const set = letters.join("");
  // Matches "(A) text", "A) text", "A. text" — possibly several on one line.
  const re = new RegExp(`(?:^|\\s)\\(?([${set}])[).]\\s+(.+?)(?=\\s+\\(?[${set}][).]\\s+|$)`, "g");
  const kept: string[] = [];
  for (const line of text.split("\n")) {
    const clean = line.replace(/^\s*[-*]\s+/, "").replace(/\*\*/g, "");
    const found: [string, string][] = [];
    if (/^\s*\(?[A-F][).]\s+/.test(clean)) {
      for (const m of clean.matchAll(re)) found.push([m[1]!, m[2]!.trim()]);
    }
    if (found.length) {
      for (const [k, v] of found) if (!labels[k] && v) labels[k] = v;
    } else kept.push(line);
  }
  if (!letters.every((l) => labels[l])) return { text, labels: {} };
  return { text: kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd(), labels };
}
