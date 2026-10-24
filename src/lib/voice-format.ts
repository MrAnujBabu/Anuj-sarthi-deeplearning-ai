import { chapterLabel, takeChapter } from "@/lib/ncert-biology";
import { dynamicVoiceTable, spokenTableColumns } from "@/lib/voice-table";

/**
 * Turn a spoken tutor reply (one long run-on paragraph) into structured study notes:
 * result heading, highlighted correct answer, explanation bullets, NCERT and memory-tip
 * callouts, Match tables, Assertion–Reason boxes and the next question as its own card
 * with options listed A–D. Display only — the spoken audio is unchanged.
 */
export function formatVoiceReply(raw: string, opts: { options?: boolean; feedbackToggle?: boolean } = {}): string {
  showOptions = opts.options !== false;
  toggleFeedback = opts.feedbackToggle === true;
  try { return format(raw); } finally { showOptions = true; toggleFeedback = false; }
}

/** The quiz card renders A–D as answer buttons, so it hides the spoken option list. */
let showOptions = true;
/** The quiz card folds the previous answer's grading into a toggle so the new question leads. */
let toggleFeedback = false;

const escapeSummary = (s: string) => s.replace(/\*\*|\*/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();

/** Verdict heading + correct-answer line become the toggle summary; the explanation goes inside. */
function feedbackToggleBlock(md: string): string {
  const summary: string[] = [];
  const body: string[] = [];
  for (const block of md.split(/\n{2,}/)) {
    const heading = block.match(/^#### ([🎉❌📝].*)$/u);
    if (heading && summary.length === 0) { summary.push(heading[1] ?? ""); continue; }
    const verdict = block.match(/^> \*\*(✅[^\n]*)\*\*$/u);
    if (verdict && summary.length <= 1 && body.length === 0) { summary.push(verdict[1] ?? ""); continue; }
    body.push(block);
  }
  const title = escapeSummary(summary.join(" · ")) || "📘 Pichhle sawal ka jawab";
  // One tap opens the whole explanation: no heading or second toggle inside the fold.
  const inner = body
    .filter((b) => b !== "#### 📘 Explanation")
    .join("\n\n")
    .replace(/<details>\n<summary>[^\n]*<\/summary>\n\n([\s\S]*?)\n<\/details>/g, "$1")
    .trim();
  if (!inner) return `> **${title}**`;
  return `<details>\n<summary>${title}</summary>\n\n${inner}\n\n</details>`;
}

function format(raw: string): string {
  // Structured quiz payloads already have meaningful table rows; do not flatten them.
  if (/^\s*\|.+\|\s*$/m.test(raw) && /^\s*\|\s*:?-{3,}/m.test(raw)) {
    return showOptions ? raw.trim() : raw.split(/^\s*(?:Options?\s*:|(?:[-*]\s*)?(?:\*\*)?\(?A[).:]\s)/mi)[0]?.trim() ?? raw.trim();
  }
  let t = raw.replace(/\s+/g, " ").trim();
  if (!t) return t;
  const cmp = comparisonTable(t);
  if (cmp) return [cmp.before && format(cmp.before), cmp.table, cmp.after && format(cmp.after)].filter(Boolean).join("\n\n");
  t = stripFillers(t);
  t = spokenOptions(t);

  const marker = t.match(/((?:Chalo,?\s*)?(?:(?:agla|next)\s+(?:prashn|prashna|question|sawal|sawaal)(?:,?\s*(?:number|no\.?)\s*\w+)?|(?:question|prashn|sawal|sawaal)\s+(?:number|no\.?)\s*\w+)[.,:!]?)/i);
  const hasOptions = OPTION_START.test(t) || MATCH_COLUMNS.test(t) || /\bAssertion\s*(?:\(A\))?\s*:\s*.+\bReason\s*(?:\(R\))?\s*:/i.test(t);
  let feedback = t;
  let next = "";
  let label = "";
  // Only split off a question card when options actually follow; "skip karke agla sawal" alone is plain text.
  const after = marker?.index !== undefined ? t.slice(marker.index + marker[0].length).trim() : "";
  if (marker && marker.index !== undefined && (OPTION_START.test(after) || MATCH_COLUMNS.test(after))) {
    feedback = t.slice(0, marker.index).trim();
    next = t.slice(marker.index + marker[0].length).trim();
    label = marker[0];
  } else if (hasOptions) {
    feedback = "";
    next = t;
  }

  const parts: string[] = [];
  const question = !!(next || label);
  const folded = toggleFeedback && question;
  if (feedback) parts.push(folded ? feedbackToggleBlock(formatFeedback(feedback)) : formatFeedback(feedback));
  if (question) parts.push(formatQuestion(next, label, !!feedback && !folded));
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** "Option A, X. Option B, Y…" or "A, X, B, Y, C, Z, D, W." → "Option A: X. B: Y. C: Z. D: W." */
function spokenOptions(t: string): string {
  const o = String.raw`(?:Option\s+)?`;
  const re = new RegExp(String.raw`(^|[.?!:]\s+)${o}A\s*,\s+(.+?)[.,]?\s+${o}B\s*,\s+(.+?)[.,]?\s+${o}C\s*,\s+(.+?)[.,]?\s+${o}D\s*,\s+(.+?)(?=[.?!](?:\s|$)|$)`);
  return t.replace(re, (_m, pre: string, a: string, b: string, c: string, d: string) => `${pre}Option A: ${a}. B: ${b}. C: ${c}. D: ${d}`);
}

const OPTION_START = /(?:^|[.?!:;|]\s*|\n\s*|(?<!Assertion)\s(?=\(A\)\s))(?:Options?\s+)?(?:\(A\)\s*[:.]?|A\s*[:)])\s*\S/;
const NUMBERS: Record<string, string> = { ek: "1", one: "1", do: "2", two: "2", teen: "3", three: "3", char: "4", chaar: "4", four: "4", paanch: "5", panch: "5", five: "5", chhe: "6", che: "6", six: "6", saat: "7", seven: "7", aath: "8", eight: "8", nau: "9", nine: "9", das: "10", ten: "10" };

function stripFillers(t: string): string {
  let prev = "";
  while (prev !== t) {
    prev = t;
    t = t
      .replace(/^(?:Hmm+|Umm+|Mm+|Uh+|Achha|Accha|Okay|Ok|Haan)[,.!]?\s+/i, "")
      .replace(/^Ek (?:second|minute|sec)[,.!]?\s*(?:main\s+)?(?:check|dekh)\s*(?:kar)?(?:ti|ta)\s+hoon[.!]?\s*/i, "")
      .replace(/^Ek (?:second|minute|sec)[,.!]\s*/i, "");
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function sentences(t: string): string[] {
  // Never split after list labels such as "a." or "ii." (Match columns read aloud).
  return t.split(/(?<=(?<!\b(?:[a-dA-D]|i{1,3}|iv))[.?!]["”']?)\s+(?=["“(]?[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
}

const emphasize = (s: string) => s.replace(/(["“])([^"”]{1,40})(["”])/g, "**$1$2$3**");

/** "X mein teen type hote hain: a, b, aur c." → intro line + nested list. */
function expandList(s: string, indent: string): string | null {
  const m = s.match(/^(.{3,140}?):\s+(.+?)[.]?$/);
  if (!m) return null;
  const items = (m[2] ?? "").split(/\s*,\s*(?:aur|and|ya|or)?\s*|\s+(?:aur|and)\s+/i).map((x) => x.trim()).filter(Boolean);
  if (items.length < 3 || items.some((x) => x.split(" ").length > 5)) return null;
  return `${m[1]}:\n${items.map((x) => `${indent}- ${emphasize(x)}`).join("\n")}`;
}

function callout(s: string): string | null {
  const box = (title: string, body: string) => `> ${title} ${expandList(body, "> ") ?? emphasize(body)}`;
  if (/^NCERT\b|\bNCERT (?:ke|ki|ka|mein|me|according|says)\b/i.test(s)) return box("📚 **NCERT:**", s.replace(/^NCERT\s+(?:ke|ki)\s+(?:mutabik|hisaab se|anusaar),?\s*/i, ""));
  if (/\b(?:yaad rakho|yaad rakhna|trick|tip|dhyan rakho|remember|mnemonic)\b/i.test(s)) return box("💡 **Yaad rakho:**", s.replace(/^(?:Isko\s+)?(?:pehchanne ka tareeka\s+)?(?:yaad rakho|yaad rakhna|remember)\s*[:,]?\s*/i, ""));
  return null;
}

function formatFeedback(raw: string): string {
  const ch = takeChapter(raw);
  const out = formatFeedbackBody(ch.text);
  return ch.chapter ? `${out}\n\n> 📖 **NCERT chapter:** ${chapterLabel(ch.chapter).replace(/^NCERT /, "")}`.trim() : out;
}

/** Spoken ordinals ("Pehla …, doosra …") become a real numbered list. */
const ORDINALS: Record<string, number> = { pehla: 1, pahla: 1, first: 1, doosra: 2, dusra: 2, second: 2, teesra: 3, tisra: 3, third: 3, chautha: 4, choutha: 4, fourth: 4, paanchvaan: 5, paanchwan: 5, panchvaan: 5, fifth: 5, chhata: 6, sixth: 6 };

function ordinalPoint(s: string): { n: number; rest: string } | null {
  // A comma/colon/dash must follow the ordinal; "Pehla sawaal pending hai" is an adjective, not a list.
  const m = s.match(/^(pehla|pahla|first|doosra|dusra|second|teesra|tisra|third|chautha|choutha|fourth|paanchvaan|paanchwan|panchvaan|fifth|chhata|sixth)(?:\s+(?:point|cheez|baat|step|kaaran|reason|number))?\s*[:,;\-–—]\s+/i);
  if (!m) return null;
  const n = ORDINALS[m[1]?.toLowerCase() ?? ""];
  if (!n) return null;
  const rest = s.slice(m[0].length);
  return { n, rest: rest.charAt(0).toUpperCase() + rest.slice(1) };
}

const isListItem = (b: string) => b.startsWith("- ") || /^\d+\. /.test(b);

/** Spoken "Detail mein: …" becomes a collapsible toggle section in the transcript. */
const TOGGLE_START = /^(?:detail|details|vistar|vistaar|expand)(?:\s+(?:mein|me|se|karke))?\s*[:,]\s*(.+)$/i;

function toggleBlock(s: string): { summary: string; body: string } | null {
  const m = s.match(TOGGLE_START);
  if (!m) return null;
  const body = (m[1] ?? "").trim();
  if (body.length < 12) return null;
  const first = body.split(/[.?!]/)[0]?.trim() ?? "";
  const summary = first.length > 70 ? first.slice(0, 67) + "…" : first || "Detail";
  return { summary, body };
}

function formatFeedbackBody(t: string): string {
  const out: string[] = [];
  const list = sentences(t);
  const vIdx = list.findIndex((s) => /\b(?:Sahi jawab|Correct answer|Right answer|Sahi answer)\b/i.test(s));
  let rest = list;
  if (vIdx >= 0) {
    const reaction = list.slice(0, vIdx).join(" ");
    const verdict = list[vIdx] ?? "";
    const wrong = /chook|galat|wrong|incorrect|nahi,? sahi|not correct|close tha/i.test(reaction + " " + verdict);
    const right = !wrong && /shabash|bilkul|sahi (?:jawab )?diya|correct|great|well done|excellent|perfect|zabardast|badhiya/i.test(reaction);
    // A long lead-in (e.g. the end of the question read aloud) stays as text above a short heading.
    const shortReaction = reaction.length <= 80 ? reaction : "";
    if (reaction && !shortReaction) out.push(emphasize(reaction));
    const heading = shortReaction || (wrong ? "Galat jawab" : right ? "Sahi jawab!" : "Result");
    out.push(`#### ${wrong ? "❌" : right ? "🎉" : "📝"} ${heading.replace(/[.!]+$/, "")}`);
    const vm = verdict.match(/(Sahi jawab|Correct answer|Right answer|Sahi answer)\s+(?:option\s+)?\(?([A-D])\)?\s*(?:hai|is)?\s*[—–:-]?\s*([^.]*)\.?\s*(.*)$/i);
    if (vm) {
      const what = (vm[3] ?? "").replace(/^[\s,;:—–-]+/, "").trim();
      out.push(`> **✅ ${vm[1]}: (${vm[2]})${what ? ` — ${what}` : ""}**`);
      rest = [...(vm[4]?.trim() ? [vm[4].trim()] : []), ...list.slice(vIdx + 1)];
    } else {
      out.push(`> **✅ ${verdict}**`);
      rest = list.slice(vIdx + 1);
    }
  }

  const bullets = vIdx >= 0 || (rest.length >= 4 && rest.join(" ").length / rest.length > 45);
  const body: string[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { body.push(para.join(" ")); para = []; } };
  for (const s of rest) {
    const c = callout(s);
    if (c) { flush(); body.push(c); continue; }
    const tg = toggleBlock(s);
    if (tg) { flush(); body.push(`<details>\n<summary>📂 ${emphasize(tg.summary)}</summary>\n\n${emphasize(tg.body)}\n</details>`); continue; }
    const o = ordinalPoint(s);
    if (o) { flush(); body.push(`${o.n}. ${emphasize(o.rest)}`); continue; }
    const l = expandList(s, bullets ? "  " : "");
    if (bullets) body.push(`- ${l ?? emphasize(s)}`);
    else if (l) { flush(); body.push(l); }
    else { para.push(emphasize(s)); if (para.length === 2) flush(); }
  }
  flush();
  if (body.length) {
    if (vIdx >= 0) out.push("#### 📘 Explanation");
    // Keep consecutive bullets as one list; other blocks get blank lines around them.
    out.push(body.reduce((acc, b, i) => acc + (i === 0 ? "" : isListItem(b) && isListItem(body[i - 1] ?? "") ? "\n" : "\n\n") + b, ""));
  }
  return out.join("\n\n");
}

function formatQuestion(t: string, label: string, separate: boolean): string {
  const out: string[] = [];
  if (separate) out.push("---");
  const num = label.match(/(?:number|no\.?|question|prashn|sawal)\s*(\d+|[a-z]+)\s*[.?!]?$/i)?.[1]?.toLowerCase();
  const n = num && (/^\d+$/.test(num) ? num : NUMBERS[num]);
  out.push(`#### ❓ ${n ? `Question ${n}` : label ? "Agla sawal" : "Question"}`);
  const ch = takeChapter(t);
  t = ch.text;
  if (ch.chapter) out.push(`> 📖 **${chapterLabel(ch.chapter)}**`);
  if (!t) return out.join("\n\n");

  t = matchTable(t);
  const opt = t.search(OPTION_START);
  let stem = opt >= 0 ? t.slice(0, opt + (/^[.?!:|]/.test(t.slice(opt)) ? 1 : 0)).trim() : t;
  const optText = opt >= 0 ? t.slice(opt).replace(/^[.?!:|]?\s*/, "") : "";

  stem = stem.charAt(0).toUpperCase() + stem.slice(1);
  stem = stem.replace(/^Options?\s*[:\-]?\s*$/i, "").replace(/\s*Options?\s*[:\-]?\s*$/i, "");
  const ar = stem.match(/^(.*?)\bAssertion\s*(?:\(A\))?\s*[:,\-]\s*(.+?)\s*\bReason\s*(?:\(R\))?\s*[:,\-]\s*(.+)$/i);
  if (ar) {
    if (ar[1]?.trim()) out.push(`**${ar[1].trim()}**`);
    out.push(`> **Assertion (A):** ${ar[2]?.trim()}\n>\n> **Reason (R):** ${ar[3]?.trim()}`);
  } else if (stem) {
    out.push(stem.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => (b.startsWith("|") ? b : `**${b}**`)).join("\n\n"));
  }

  if (optText) {
    const segs = optText.split(/(?:^|(?<=[.?!,;]\s*)|\s+)(?:Options?\s+)?(?:\(([A-D])\)\s*[:.]?|([A-D])\s*[:)])\s+/).slice(1);
    // split() yields [letterInParens, bareLetter, body, ...]; fold to [letter, body, ...].
    const folded: string[] = [];
    for (let i = 0; i < segs.length; i += 3) folded.push(segs[i] ?? segs[i + 1] ?? "", segs[i + 2] ?? "");
    segs.splice(0, segs.length, ...folded);
    const lines: string[] = [];
    let prompt = "";
    for (let i = 0; i < segs.length; i += 2) {
      let body = (segs[i + 1] ?? "").trim();
      if (i + 2 >= segs.length) {
        const cut = body.match(/^(.+?[.?!])\s+(.+)$/);
        if (cut && !/^[a-d]-/i.test(cut[2] ?? "")) { body = cut[1] ?? body; prompt = cut[2] ?? ""; }
      }
      lines.push(`- **(${segs[i]})** ${body.replace(/[.;,]$/, "")}`);
    }
    if (showOptions) out.push(lines.join("\n"));
    // Anything after the closing prompt (e.g. the grading of an answer) is its own reply.
    const [ask, ...after] = sentences(prompt);
    if (ask && showOptions) out.push(`*🎤 ${ask}*`);
    if (after.length) out.push(format(after.join(" ")));
  }
  return out.join("\n\n");
}

/** "Column I: a. X, b. Y … Column II: i. P, ii. Q …" → markdown table. */
function matchTable(t: string): string {
  const m = t.match(MATCH_COLUMNS);
  if (!m) return t;
  return buildTable(t, m);
}

// "Column I: a. … Column II: i. …" — the labels must follow, so "Column I ko Column II se match karo" is not a table.
const MATCH_COLUMNS = /Column\s*(?:I|1|one)\s*[:\-]?\s*(\(?a[.)]\s.+?)\s*Column\s*(?:II|2|two)\s*[:\-]?\s*(\(?i[.)]\s.+?)(?=(?:Options?\b|\(A\)|\bA\s*[:)])|$)/i;

function buildTable(t: string, m: RegExpMatchArray): string {
  if (!m) return t;
  const items = (s: string, re: RegExp) => s.split(re).map((x) => x.replace(/^[\s,.;:]+|[\s,.;]+$/g, "")).filter(Boolean);
  const left = items(m[1] ?? "", /\b\(?[a-d]\)?[.)]\s+/i);
  const right = items(m[2] ?? "", /\b\(?(?:iv|i{1,3})\)?[.)]\s+/i);
  if (left.length < 2 || left.length !== right.length) return t;
  const roman = ["i", "ii", "iii", "iv"];
  const rows = left.map((l, k) => `| ${"abcd"[k]}. ${l} | ${roman[k]}. ${right[k]} |`).join("\n");
  return t.replace(m[0], `\n\n| Column I | Column II |\n|---|---|\n${rows}\n\n`);
}

/**
 * Spoken comparison → markdown table.
 * "Tulna: Mitosis aur Meiosis. Cells — Mitosis: 2, Meiosis: 4. Division — Mitosis: ek baar, Meiosis: do baar. Tulna khatam."
 * Needs at least two rows whose cells name every compared item; otherwise the text stays prose.
 */
export function comparisonTable(t: string): { before: string; table: string; after: string } | null {
  const dynamic = dynamicVoiceTable(t);
  if (dynamic) return dynamic;
  const head = t.match(/\b(?:Tulna|Comparison|Table)\s*:\s*([^.:]+?)\s*\./i);
  if (!head || head.index === undefined) return null;
  const cols = spokenTableColumns(head[1] ?? "");
  if (cols.length < 2) return null;
  const rest = t.slice(head.index + head[0].length);
  const endM = rest.match(/\b(?:Tulna|Comparison|Table)\s+(?:khatam|end|over)\b[.!]?/i);
  const body = endM?.index !== undefined ? rest.slice(0, endM.index) : rest;
  const after = endM?.index !== undefined ? rest.slice(endM.index + endM[0].length).trim() : "";
  const esc = (s: string) => s.replace(/\|/g, "/").trim();
  const rows: string[][] = [];
  let tail = "";
  let plain: boolean | null = null; // plain rows: "Skull — 22 bones." fill the named columns directly
  const q = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const sentence of body.split(/(?<=[.;])\s+/)) {
    const s = sentence.trim().replace(/[.;]\s*$/, "");
    const m = s.match(/^([^—–:]+?)\s+[—–-]\s+(.+)$/);
    let row: string[] | null = null;
    if (m && plain !== true) {
      const cells = cols.map((c) => m[2]?.match(new RegExp(`${q(c)}\\s*:\\s*(.+?)(?=,\\s*(?:${cols.map(q).join("|")})\\s*:|$)`, "i"))?.[1]?.replace(/[,;]\s*$/, "") ?? null);
      if (cells.every((c) => c)) { row = [m[1] ?? "", ...(cells as string[])]; plain = false; }
    }
    if (!row && plain !== false) {
      // Spoken transcripts may join rows with commas or use "Skull: 22" instead of a dash.
      const sep = cols.length === 2 ? /\s+[—–-]\s+|\s*:\s+/ : /\s+[—–-]\s+/;
      const cut = (x: string) => x.split(sep).map((y) => y.trim());
      const whole = cut(s);
      const subs = s.split(/,\s+(?=[^,]+?(?:\s+[—–-]\s+|:\s))/).map(cut);
      const ok = (r: string[]) => r.length === cols.length && r.every(Boolean);
      if (ok(whole)) { row = whole; plain = true; }
      else if (subs.length > 1 && subs.every(ok) && !tail) { rows.push(...subs.map((r) => r.map(esc))); plain = true; continue; }
    }
    if (row && !tail) rows.push(row.map(esc));
    else if (s) tail += (tail ? " " : "") + sentence.trim();
  }
  if (rows.length < 2) return null;
  const header = plain ? cols : ["Feature", ...cols];
  const table = [`| ${header.map(esc).join(" | ")} |`, `|${"---|".repeat(header.length)}`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
  return { before: t.slice(0, head.index).trim(), table, after: [tail, after].filter(Boolean).join(" ").trim() };
}
