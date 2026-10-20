import { stripCards } from './srs';

/**
 * Pull the option text for an open quiz question so the answer cards can show it,
 * and return the question text without those options (the cards replace them).
 * Accepts letter markers "(A) / A) / A." and NEET-paper number markers "(1) / 1) / 1.",
 * on their own lines or inline after the question; numbers map to A–D so submissions stay A–D.
 */
const LETTERS = "ABCDEF";
const toLetter = (m: string) => (/^[1-6]$/.test(m) ? LETTERS[Number(m) - 1] ?? '' : m.toUpperCase());

export function extractQuizOptions(text: string, options: string[]): { text: string; labels: Record<string, string> } {
  text = stripCards(text);
  const labels: Record<string, string> = {};
  const letters = options.map((o) => toLetter(o.trim())).filter((o) => /^[A-F]$/.test(o));
  if (!letters.length) {
    const kept = text.split("\n").filter((l) => !/^\s*[-*]?\s*(\*\*)?\(?[A-F1-6][).]\s+/.test(l));
    return { text: kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd(), labels };
  }
  const nums = letters.map((l) => String(LETTERS.indexOf(l) + 1)).join("");
  const set = letters.join("") + letters.join("").toLowerCase() + nums;
  const marker = `\\(?([${set}])[).]`;
  // Option starts: line start, or whitespace before a "(x)" marker (bare "x." inline is too ambiguous).
  const re = new RegExp(`(?:^|\\s)${marker}\\s+(.+?)(?=\\s+${marker}\\s+|$)`, "g");
  const firstInline = new RegExp(`\\s\\((?:A|a|1)\\)\\s+`);
  const kept: string[] = [];
  for (const line of text.split("\n")) {
    const clean = line.replace(/^\s*[-*]\s+/, "").replace(/\*\*/g, "");
    let prefix = "";
    let body = clean;
    if (!/^\s*\(?[A-Fa-f1-6][).]\s+/.test(clean)) {
      const m = firstInline.exec(clean);
      if (!m) { kept.push(line); continue; }
      prefix = clean.slice(0, m.index).trimEnd();
      body = clean.slice(m.index);
    }
    const found: [string, string][] = [];
    for (const m of body.matchAll(re)) {
      if (m[1] && m[2]) found.push([toLetter(m[1]), m[2].trim()]);
    }
    if (found.length < 2 && prefix) { kept.push(line); continue; }
    if (!found.length) { kept.push(line); continue; }
    for (const [k, v] of found) if (!labels[k] && v) labels[k] = v;
    if (prefix) kept.push(prefix);
  }
  if (!letters.every((l) => labels[l])) return { text, labels: {} };
  return { text: kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd(), labels };
}
