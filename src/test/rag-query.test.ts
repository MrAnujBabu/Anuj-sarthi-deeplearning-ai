import { describe, expect, it } from "vitest";
import { detectSubject, expandFollowUp } from "@/lib/rag/query";
import { isAllowedPdfUrl } from "@/lib/rag/fetch-pdf.functions";

describe("retrieval query parsing", () => {
  it("narrows a mitochondria question to biology", () => {
    expect(detectSubject("Mitochondria ko powerhouse kyun kehte hain?")).toBe("biology");
  });
  it("leaves mixed-subject questions unfiltered", () => {
    expect(detectSubject("energy of a cell in respiration")).toBeNull();
  });
  it("short follow-up borrows the previous question", () => {
    expect(expandFollowUp("aur example?", "What is osmosis in plant cells")).toContain("osmosis");
  });
  it("full new question is not expanded", () => {
    expect(expandFollowUp("Explain the structure of chloroplast thylakoid membranes", "osmosis")).not.toContain("osmosis");
  });
  it("link import only accepts ncert.nic.in PDFs", () => {
    expect(isAllowedPdfUrl("https://ncert.nic.in/textbook/pdf/kebo108.pdf")).toBe(true);
    expect(isAllowedPdfUrl("https://evil.com/kebo108.pdf")).toBe(false);
  });
});

import { pagesFromFirecrawl } from "@/lib/rag/fetch-pdf.functions";
describe("link import page numbers", () => {
  it("numbers Firecrawl PDF pages in order", () => {
    expect(pagesFromFirecrawl("one\n---\ntwo")).toBe("[Page 1]\none\n\n[Page 2]\ntwo");
  });
});

import { chunkText } from "@/lib/rag/chunk";
describe("chunk page numbers", () => {
  it("later chunks carry their own page, not page 1", () => {
    const para = (n: number) => Array.from({ length: 6 }, () => `Sentence about topic ${n} with enough words to fill space.`).join(" ");
    const raw = [1, 2, 3, 4].map((p) => `[Page ${p}]\n${para(p)}\n\n${para(p)}`).join("\n\n");
    const pages = chunkText(raw).map((c) => c.page);
    expect(Math.max(...pages)).toBeGreaterThanOrEqual(3);
  });
});
