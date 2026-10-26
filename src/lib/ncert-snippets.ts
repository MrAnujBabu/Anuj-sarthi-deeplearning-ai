/**
 * NCERT Deep Scan — client-safe pure logic.
 * Turns scraped chapter markdown into topic-wise snippets, revision cards and a
 * chapter-structure quiz queue. No network or storage here; see ncert-scan.server.ts.
 */
import { cardId, type Card } from "./srs";

export type NcertSnippet = {
  topic: string;
  text: string;
  sourceUrl?: string | undefined;
  verified?: boolean | undefined;
};

const MIN_SNIPPET = 80;
const MAX_SNIPPET = 600;
export const MAX_SNIPPETS_PER_CHAPTER = 12;

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, " ").trim();

/** Split scraped chapter markdown into topic sections keyed by their headings. */
export function extractSnippets(markdown: string): NcertSnippet[] {
  const out: NcertSnippet[] = [];
  // Split on markdown headings; keep the heading as the topic.
  const parts = markdown.split(/^(#{1,3})\s+(.+)$/m);
  // parts: [pre, hashes, title, body, hashes, title, body, ...]
  for (let i = 1; i + 2 <= parts.length; i += 3) {
    const topic = (parts[i + 1] ?? "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [text](url) → text
      .replace(/[*_`#\\]/g, "")
      .trim()
      .slice(0, 80);
    const body = (parts[i + 2] ?? "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
      .replace(/\[[^\]]*\]\([^)]*\)/g, "") // links
      .replace(/\|/g, " ") // tables
      .replace(/\s+/g, " ")
      .trim();
    if (!topic || body.length < MIN_SNIPPET) continue;
    out.push({ topic, text: body.slice(0, MAX_SNIPPET) });
    if (out.length >= MAX_SNIPPETS_PER_CHAPTER) break;
  }
  return dedupeSnippets(out);
}

/** Drop near-duplicate snippets (same normalized start), keeping the first. */
export function dedupeSnippets(snippets: NcertSnippet[]): NcertSnippet[] {
  const seen = new Set<string>();
  return snippets.filter((s) => {
    const key = normalize(s.text).slice(0, 120);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A snippet becomes a flip card: front asks for the NCERT line on the topic, back is the line. */
export function snippetToCard(s: NcertSnippet, chapter: string): Card {
  const q = `NCERT line — ${s.topic}?\n(${chapter})`;
  return {
    id: cardId(q),
    q,
    a: s.text,
    topic: s.verified === false ? `${s.topic} · verify pending` : s.topic,
    box: 1,
    due: 0,
    reviews: 0,
    lastCorrect: false,
  };
}

/** Chapter-wise quiz order: topics in the order they appear in the chapter. */
export function structureQuizQueue(snippets: NcertSnippet[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const s of snippets) {
    const t = s.topic.trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      order.push(t);
    }
  }
  return order;
}

/** Prompt sent to the tutor for a structure-based quiz over one topic. */
export function topicQuizPrompt(chapter: string, topic: string, snippet: string) {
  return `Quiz mode ON — chapter-wise quiz. Chapter: ${chapter}. Ab sirf is topic par ek NEET MCQ poochho: "${topic}". Base it on this NCERT excerpt:\n\n${snippet}\n\nQuestion ke saath quiz tag mein options do; answer key NCERT line se hi honi chahiye.`;
}
