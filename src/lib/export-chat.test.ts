import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { dataUrlToBytes, threadFileName, threadToMarkdown, threadToMarkdownWithLinks } from "./export-chat";
import type { Thread } from "./threads";

const msg = (id: string, role: "user" | "assistant", text: string): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

const thread: Thread = {
  id: "12345678-abcd",
  title: 'Newton "second" law doubt',
  updatedAt: Date.UTC(2026, 9, 18),
  messages: [
    msg("u1", "user", "What is Newton's second law?"),
    msg("a1", "assistant", "**Answer:** $$F = ma$$\n\nStep 1: momentum…"),
    {
      id: "u2",
      role: "user",
      parts: [
        { type: "file", mediaType: "image/jpeg", url: "data:image/jpeg;base64,xx" } as never,
        { type: "text", text: "solve this" },
      ],
    },
    {
      id: "u3",
      role: "user",
      parts: [{ type: "file", mediaType: "application/pdf", filename: "notes.pdf", url: "idb:1" } as never],
    },
  ],
};

describe("threadToMarkdown", () => {
  const md = threadToMarkdown(thread);

  it("has Obsidian YAML frontmatter with safe quoting and tags", () => {
    expect(md.startsWith("---\ntitle: \"Newton 'second' law doubt\"")).toBe(true);
    expect(md).toContain("tags: [snapsolve, neet, doubt]");
    expect(md).toContain("date: 2026-10-18");
  });

  it("keeps every message in order with role headings", () => {
    expect(md).toContain("## 🧑 Student\n\nWhat is Newton's second law?");
    expect(md).toContain("## 🤖 SnapSolve\n\n**Answer:** $$F = ma$$");
    expect(md.indexOf("What is Newton's second law?")).toBeLessThan(md.indexOf("$$F = ma$$"));
  });

  it("marks attachments without embedding heavy data", () => {
    expect(md).toContain("_[Photo attached]_");
    expect(md).toContain("_[PDF attached: notes.pdf]_");
    expect(md).not.toContain("data:image/jpeg");
    expect(md).not.toContain("idb:1");
  });
});

describe("threadFileName", () => {
  it("slugifies the title and keeps a short id suffix", () => {
    expect(threadFileName(thread)).toBe("newton-second-law-doubt-12345678.md");
  });

  it("falls back for untitled threads", () => {
    expect(threadFileName({ ...thread, title: "!!!" })).toBe("doubt-12345678.md");
  });
});

describe("attachments export", () => {
  it("decodes base64 data URLs to bytes", () => {
    const bytes = dataUrlToBytes("data:image/jpeg;base64," + btoa("hello"));
    expect(new TextDecoder().decode(bytes)).toBe("hello");
  });

  it("embeds relative Obsidian links for attachments", () => {
    const links = new Map([
      ["u2", new Map([[0, "attachments/12345678-1-q.jpg"]])],
      ["u3", new Map([[0, "attachments/12345678-2-notes.pdf"]])],
    ]);
    const md = threadToMarkdownWithLinks(thread, links);
    expect(md).toContain("![[attachments/12345678-1-q.jpg]]");
    expect(md).toContain("[[attachments/12345678-2-notes.pdf]]");
    expect(md).not.toContain("_[Photo attached]_");
  });

  it("falls back to placeholders when no link is available", () => {
    const md = threadToMarkdownWithLinks(thread, new Map());
    expect(md).toContain("_[Photo attached]_");
  });
});
