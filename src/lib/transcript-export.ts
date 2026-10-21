import { voiceTranscriptMarkdown, type VoiceRow } from "@/lib/voice-transcript";

/**
 * Export the voice-call transcript to Word (.doc) and PDF without breaking the
 * markdown structure: tables stay tables, numbered/bullet lists stay lists,
 * callouts stay quoted blocks. Word opens an HTML document saved as .doc;
 * PDF goes through the browser print dialog ("Save as PDF") so the layout
 * matches exactly what the student sees.
 */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Inline markdown → HTML: bold, italic, code. Text is escaped first. */
export function inlineMd(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Markdown → HTML body. Headings, tables, lists, blockquotes, hr, paragraphs. */
export function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  // Drop the YAML frontmatter block (--- ... ---) — it is metadata, not notes.
  if (lines[0]?.trim() === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) lines.splice(0, end + 1);
  }
  const out: string[] = [];
  let i = 0;
  let para: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inlineMd).join("<br>")}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((x) => `<li>${inlineMd(x)}</li>`).join("")}</${list.tag}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote>${quote.map(inlineMd).join("<br>")}</blockquote>`); quote = []; } };
  const flush = () => { flushPara(); flushList(); flushQuote(); };

  while (i < lines.length) {
    const t = (lines[i] ?? "").trim();
    if (!t) { flush(); i++; continue; }
    if (/^\|.*\|$/.test(t)) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|$/.test((lines[i] ?? "").trim())) {
        const cells = (lines[i] ?? "").trim().slice(1, -1).split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{3,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      if (head) {
        out.push(`<table><thead><tr>${head.map((c) => `<th>${inlineMd(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inlineMd(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      }
      continue;
    }
    // Collapsible toggle blocks from the voice transcript pass through as HTML.
    if (/^<\/?details>$/.test(t)) { flush(); out.push(t); i++; continue; }
    const sum = t.match(/^<summary>(.*)<\/summary>$/);
    if (sum) { flush(); out.push(`<summary>${inlineMd(sum[1] ?? "")}</summary>`); i++; continue; }
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flush(); const level = Math.min(h[1]?.length ?? 1, 6); out.push(`<h${level}>${inlineMd(h[2] ?? "")}</h${level}>`); i++; continue; }
    if (/^-{3,}$/.test(t)) { flush(); out.push("<hr>"); i++; continue; }
    if (t.startsWith(">")) { flushPara(); flushList(); quote.push(t.replace(/^>\s?/, "")); i++; continue; }
    const ul = t.match(/^[-*]\s+(.*)$/);
    if (ul) { flushPara(); flushQuote(); if (list?.tag !== "ul") { flushList(); list = { tag: "ul", items: [] }; } list?.items.push(ul[1] ?? ""); i++; continue; }
    const ol = t.match(/^\d+[.)]\s+(.*)$/);
    if (ol) { flushPara(); flushQuote(); if (list?.tag !== "ol") { flushList(); list = { tag: "ol", items: [] }; } list?.items.push(ol[1] ?? ""); i++; continue; }
    flushList(); flushQuote();
    para.push(t); i++;
  }
  flush();
  return out.join("\n");
}

export function transcriptStamp(d = new Date()): string {
  return d.toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

export function transcriptFileName(ext: "md" | "doc" | "pdf", d = new Date()): string {
  return `snapsolve-voice-${transcriptStamp(d)}.${ext}`;
}

export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const PAGE_CSS = `
  @page { size: A4; margin: 14mm; }
  body { font-family: system-ui, "Segoe UI", sans-serif; font-size: 13px; line-height: 1.55; color: #111; max-width: 700px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 20px; } h2 { font-size: 17px; } h3 { font-size: 15px; } h4 { font-size: 13.5px; margin-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; }
  blockquote { border-left: 3px solid #4f7cff; margin: 8px 0; padding: 4px 12px; background: #f6f8ff; }
  ul, ol { margin: 6px 0; padding-left: 22px; }
  p { margin: 8px 0; }
  hr { border: none; border-top: 1px solid #ccc; margin: 14px 0; }
  code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; }
  tr, blockquote, li { break-inside: avoid; }
`;

/** Full printable HTML document for the transcript (Word opens this too). */
export function transcriptDocumentHtml(title: string, md: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PAGE_CSS}</style></head><body>${mdToHtml(md)}</body></html>`;
}

/** Word export: an HTML document saved as .doc — Word and Google Docs open it with formatting intact. */
export function exportTranscriptWord(rows: VoiceRow[]): void {
  const html = transcriptDocumentHtml("SnapSolve voice call", voiceTranscriptMarkdown(rows));
  downloadBlob(transcriptFileName("doc"), new Blob(["\ufeff", html], { type: "application/msword" }));
}

/**
 * PDF export: open a print-ready tab and call print() so the student picks
 * "Save as PDF". window.open must run synchronously in the click handler or
 * the popup blocker stops it. Returns false when the popup was blocked.
 */
export function openTranscriptPdf(rows: VoiceRow[]): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(transcriptDocumentHtml("SnapSolve voice call", voiceTranscriptMarkdown(rows)));
  win.document.close();
  win.focus();
  win.print();
  return true;
}
