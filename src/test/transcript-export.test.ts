import { describe, expect, it } from "vitest";
import { escapeHtml, inlineMd, mdToHtml, transcriptDocumentHtml, transcriptFileName, transcriptStamp } from "@/lib/transcript-export";

describe("mdToHtml", () => {
  it("keeps a markdown table as a real table", () => {
    const html = mdToHtml("| Column I | Column II |\n|---|---|\n| a. Mitochondria | i. Powerhouse |\n| b. Ribosome | ii. Protein |");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Column I</th>");
    expect(html).toContain("<td>a. Mitochondria</td>");
    expect(html).toContain("<td>ii. Protein</td>");
    expect(html).not.toContain("|---|");
  });

  it("keeps numbered and bullet lists as lists", () => {
    const html = mdToHtml("1. Pehla point\n2. Doosra point\n\n- ek\n- do");
    expect(html).toContain("<ol><li>Pehla point</li><li>Doosra point</li></ol>");
    expect(html).toContain("<ul><li>ek</li><li>do</li></ul>");
  });

  it("keeps headings, callouts and bold", () => {
    const html = mdToHtml("#### 📝 Result\n\n> **✅ Sahi jawab: (B)**\n\n**Me:** kya hai");
    expect(html).toContain("<h4>📝 Result</h4>");
    expect(html).toContain("<blockquote><strong>✅ Sahi jawab: (B)</strong></blockquote>");
    expect(html).toContain("<strong>Me:</strong> kya hai");
  });

  it("escapes HTML so injected markup cannot break the document", () => {
    const html = mdToHtml("Cell <script>alert(1)</script> & tissue");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });

  it("drops the yaml frontmatter", () => {
    const html = mdToHtml("---\ntype: voice-call\ndate: 2026-10-21\n---\n\n# Voice call\n\nHello");
    expect(html).not.toContain("voice-call");
    expect(html).toContain("<h1>Voice call</h1>");
  });
});

describe("inlineMd / escapeHtml", () => {
  it("renders bold, italic and code", () => {
    expect(inlineMd("**bold** *em* `code`")).toBe("<strong>bold</strong> <em>em</em> <code>code</code>");
  });
  it("escapes quotes and angle brackets", () => {
    expect(escapeHtml(`<a href="x">`)).toBe("&lt;a href=&quot;x&quot;&gt;");
  });
});

describe("file names", () => {
  const d = new Date("2026-10-21T01:55:00.000Z");
  it("builds a timestamped name per format", () => {
    expect(transcriptStamp(d)).toBe("2026-10-21-01-55");
    expect(transcriptFileName("doc", d)).toBe("snapsolve-voice-2026-10-21-01-55.doc");
    expect(transcriptFileName("pdf", d)).toBe("snapsolve-voice-2026-10-21-01-55.pdf");
  });
});

describe("transcriptDocumentHtml", () => {
  it("is a full utf-8 html document with the rendered body", () => {
    const html = transcriptDocumentHtml("SnapSolve voice call", "# Voice call\n\n- point");
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain("<title>SnapSolve voice call</title>");
    expect(html).toContain("<h1>Voice call</h1>");
    expect(html).toContain("<ul><li>point</li></ul>");
  });
});

describe('toggle blocks in exports', () => {
  it('passes details/summary through and bolds the summary text', () => {
    const html = mdToHtml("<details>\n<summary>📂 **Mitochondria detail**</summary>\n\nDo membrane hote hain.\n</details>");
    expect(html).toContain("<details>");
    expect(html).toContain("<summary>📂 <strong>Mitochondria detail</strong></summary>");
    expect(html).toContain("</details>");
  });
});
