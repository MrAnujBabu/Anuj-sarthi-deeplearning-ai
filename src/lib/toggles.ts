/**
 * Splits markdown text into plain segments and collapsible toggle segments
 * (`<details><summary>…</summary>…</details>`). The toggle body stays raw
 * markdown so the renderer can format headings, lists, tables and callouts
 * inside the fold — raw HTML blocks alone would leak the content out.
 */

export type ToggleSegment =
  | { kind: "text"; text: string }
  | { kind: "toggle"; summary: string; body: string };

const TOGGLE = /<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").trim();

export function splitToggles(text: string): ToggleSegment[] {
  const out: ToggleSegment[] = [];
  const re = new RegExp(TOGGLE.source, TOGGLE.flags);
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text))) {
    const before = text.slice(cursor, m.index);
    if (before.trim()) out.push({ kind: "text", text: before });
    const summary = stripTags(m[1] ?? "");
    const body = (m[2] ?? "").trim();
    out.push({ kind: "toggle", summary: summary || "Detail", body });
    cursor = m.index + m[0].length;
    re.lastIndex = cursor;
  }

  const rest = text.slice(cursor);
  if (rest.trim()) out.push({ kind: "text", text: rest });
  return out;
}
