import type { UIMessage } from "ai";
import { restoreDocs } from "./doc-store";
import type { Thread } from "./threads";

type FilePart = Extract<UIMessage["parts"][number], { type: "file" }>;

/** Obsidian-friendly markdown for one message part. */
function partToMarkdown(p: UIMessage["parts"][number]): string {
  if (p.type === "text") return p.text.trim();
  if (p.type === "file" && p.mediaType?.startsWith("image/")) return "_[Photo attached]_";
  if (p.type === "file" && p.mediaType === "application/pdf")
    return `_[PDF attached: ${("filename" in p && p.filename) || "document"}]_`;
  return "";
}

function messageToMarkdown(m: UIMessage): string {
  const body = m.parts.map(partToMarkdown).filter(Boolean).join("\n\n");
  if (!body) return "";
  return `## ${m.role === "user" ? "🧑 Student" : "🤖 SnapSolve"}\n\n${body}`;
}

function slug(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "doubt";
}

/** One Obsidian note per doubt, with YAML frontmatter (attachments as placeholders). */
export function threadToMarkdown(thread: Thread): string {
  const date = new Date(thread.updatedAt).toISOString().slice(0, 10);
  const body = thread.messages.map(messageToMarkdown).filter(Boolean).join("\n\n---\n\n");
  return [
    "---",
    `title: "${thread.title.replace(/"/g, "'")}"`,
    `date: ${date}`,
    "tags: [snapsolve, neet, doubt]",
    "---",
    "",
    `# ${thread.title}`,
    "",
    body || "_Empty doubt_",
    "",
  ].join("\n");
}

export function threadFileName(thread: Thread): string {
  return `${slug(thread.title)}-${thread.id.slice(0, 8)}.md`;
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Download a single doubt as a .md note. */
export function exportThreadMarkdown(thread: Thread) {
  download(threadFileName(thread), new Blob([threadToMarkdown(thread)], { type: "text/markdown" }));
}

/* ---------- Rich export: real photos/PDFs in an attachments folder ---------- */

type Attachment = { name: string; data: Uint8Array; link: string };

const extFor = (mediaType?: string) =>
  mediaType === "application/pdf" ? "pdf" : mediaType === "image/png" ? "png" : "jpg";

/** Decode a data: URL into bytes (supports base64 and percent-encoded). */
export function dataUrlToBytes(url: string): Uint8Array {
  const comma = url.indexOf(",");
  const meta = url.slice(0, comma);
  const body = url.slice(comma + 1);
  if (meta.includes(";base64")) {
    const bin = atob(body);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new TextEncoder().encode(decodeURIComponent(body));
}

/**
 * Collect real attachment files from a thread's messages.
 * Resolves `idb:` pointers from IndexedDB so PDFs are included too.
 * Returns attachments plus a per-message map of part index -> markdown link.
 */
export async function collectAttachments(thread: Thread): Promise<{
  attachments: Attachment[];
  links: Map<string, Map<number, string>>;
}> {
  const messages = await restoreDocs(thread.messages);
  const attachments: Attachment[] = [];
  const links = new Map<string, Map<number, string>>();
  let n = 0;
  for (const m of messages) {
    for (let i = 0; i < m.parts.length; i++) {
      const p = m.parts[i];
      if (!p || p.type !== "file" || !("url" in p) || !p.url.startsWith("data:")) continue;
      const mediaType = "mediaType" in p ? p.mediaType : undefined;
      n += 1;
      const rawName = ("filename" in p && p.filename) || `attachment-${n}`;
      const safe = rawName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 50);
      const name = `${thread.id.slice(0, 8)}-${n}-${safe}.${extFor(mediaType)}`;
      attachments.push({ name, data: dataUrlToBytes(p.url), link: `attachments/${name}` });
      if (!links.has(m.id)) links.set(m.id, new Map());
      links.get(m.id)!.set(i, `attachments/${name}`);
    }
  }
  return { attachments, links };
}

/** Note markdown for a thread, embedding relative attachment links where available. */
export function threadToMarkdownWithLinks(thread: Thread, links: Map<string, Map<number, string>>): string {
  const date = new Date(thread.updatedAt).toISOString().slice(0, 10);
  const body = thread.messages
    .map((m) => {
      const parts = m.parts
        .map((p, i) => {
          const link = links.get(m.id)?.get(i);
          if (link) {
            return "mediaType" in p && p.mediaType?.startsWith("image/") ? `![[${link}]]` : `[[${link}]]`;
          }
          return partToMarkdown(p);
        })
        .filter(Boolean)
        .join("\n\n");
      if (!parts) return "";
      return `## ${m.role === "user" ? "🧑 Student" : "🤖 SnapSolve"}\n\n${parts}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
  return [
    "---",
    `title: "${thread.title.replace(/"/g, "'")}"`,
    `date: ${date}`,
    "tags: [snapsolve, neet, doubt]",
    "---",
    "",
    `# ${thread.title}`,
    "",
    body || "_Empty doubt_",
    "",
  ].join("\n");
}

/** Download every doubt as an Obsidian vault zip: notes + index + real attachments. */
export async function exportAllMarkdown(threads: Thread[]) {
  const { zipSync, strToU8 } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  const index: string[] = [
    "---",
    "title: SnapSolve doubts",
    "tags: [snapsolve, neet]",
    "---",
    "",
    "# SnapSolve — All doubts",
    "",
  ];
  for (const t of threads) {
    const name = threadFileName(t);
    const { attachments, links } = await collectAttachments(t);
    files[name] = strToU8(threadToMarkdownWithLinks(t, links));
    for (const a of attachments) files[a.link] = a.data;
    index.push(`- [[${name.replace(/\.md$/, "")}|${t.title}]] — ${new Date(t.updatedAt).toLocaleDateString()}`);
  }
  index.push("");
  files["index.md"] = strToU8(index.join("\n"));
  const zipped = zipSync(files, { level: 6 });
  const stamp = new Date().toISOString().slice(0, 10);
  download(`snapsolve-obsidian-${stamp}.zip`, new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" }));
}
