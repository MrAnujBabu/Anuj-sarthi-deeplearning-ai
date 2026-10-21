/** Pure helpers for the admin NCERT library + PYQ bank import (browser-safe, unit-tested). */
import type { PyqRecord } from "./store";

/** RFC-4180-ish CSV rows: quoted fields, escaped quotes, commas/newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export const PYQ_COLUMNS = ["year", "subject", "chapter", "question", "a", "b", "c", "d", "answer", "explanation", "source"] as const;

/**
 * PYQ spreadsheet → records. Header row required: year, subject, chapter, question, a, b, c, d, answer, explanation, source
 * (option columns may also be named option_a / optionA). Rows without a valid year, question, 4 options or an A–D answer are skipped.
 */
export function csvToPyqs(text: string): { records: PyqRecord[]; skipped: number } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { records: [], skipped: 0 };
  const head = rows[0]!.map((h) => h.trim().toLowerCase().replace(/^option[_ ]?/, ""));
  const col = (r: string[], name: string) => (r[head.indexOf(name)] ?? "").trim();
  const records: PyqRecord[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const year = Number(col(r, "year"));
    const question = col(r, "question");
    const options = ["a", "b", "c", "d"].map((k) => col(r, k));
    const answer = col(r, "answer").replace(/[()]/g, "").toUpperCase();
    if (!Number.isInteger(year) || year < 1990 || year > 2100 || !question || options.some((o) => !o) || !/^[A-D]$/.test(answer)) { skipped++; continue; }
    records.push({
      id: `pyq-${year}-${hash(question)}`,
      year, question, options, answer,
      subject: col(r, "subject").toLowerCase() || "general",
      chapter: col(r, "chapter"),
      explanation: col(r, "explanation"),
      source: col(r, "source") || `NEET ${year}`,
    });
  }
  return { records, skipped };
}

/** Stable short hash so re-importing the same sheet overwrites instead of duplicating. */
export function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Split an array into fixed-size batches. */
export function batches<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Read a text-based PDF in the browser as "[Page N]" text. Returns "" for scanned PDFs. */
export async function pdfFileToText(file: File): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
  const { text: pages } = await extractText(pdf, { mergePages: false });
  const body = (pages as string[]).map((t, i) => `[Page ${i + 1}]\n${t.replace(/[ \t]+/g, " ").trim()}`).join("\n\n");
  return body.replace(/\[Page \d+\]/g, "").trim().length < 200 ? "" : body;
}
