/**
 * Hybrid retrieval (DeepLearning.AI RAG course, modules 2–3):
 * keyword BM25 + semantic cosine, merged with Reciprocal Rank Fusion.
 * Keyword search catches exact NCERT terms; vectors catch paraphrases.
 */
const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "which", "what", "when", "kya", "hai", "ka", "ki", "ke", "hota", "kaise", "kyun"]);

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\u0900-\u097F ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { const x = a[i]!, y = b[i]!; dot += x * y; na += x * x; nb += y * y; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** BM25 scores (k1=1.2, b=0.75) for each document against the query. */
export function bm25(query: string, docs: string[], k1 = 1.2, b = 0.75): number[] {
  const q = [...new Set(tokenize(query))];
  const toks = docs.map(tokenize);
  const N = docs.length || 1;
  const avg = toks.reduce((s, t) => s + t.length, 0) / N || 1;
  const df = new Map<string, number>();
  for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
  return toks.map((t) => {
    const tf = new Map<string, number>();
    for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1);
    let s = 0;
    for (const w of q) {
      const f = tf.get(w);
      if (!f) continue;
      const n = df.get(w) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * t.length) / avg)));
    }
    return s;
  });
}

/** Reciprocal Rank Fusion of several ranked id lists (k=60 per the original paper). */
export function rrf(rankings: string[][], k = 60): Map<string, number> {
  const out = new Map<string, number>();
  for (const list of rankings) list.forEach((id, i) => out.set(id, (out.get(id) ?? 0) + 1 / (k + i + 1)));
  return out;
}

export type HybridDoc = { id: string; text: string; vector: number[] };

/** Top-k by hybrid search; drops docs weak on both signals so off-topic chunks never reach the tutor. */
export function hybridSearch<T extends HybridDoc>(query: string, queryVector: number[], docs: T[], k = 5, minCosine = 0.3): T[] {
  if (!docs.length) return [];
  const sem = docs.map((d) => cosine(queryVector, d.vector));
  const kw = bm25(query, docs.map((d) => d.text));
  const idx = docs.map((_, i) => i);
  const top = 50;
  const semRank = idx.filter((i) => sem[i]! >= minCosine).sort((a, b) => sem[b]! - sem[a]!).slice(0, top);
  const kwRank = idx.filter((i) => kw[i]! > 0).sort((a, b) => kw[b]! - kw[a]!).slice(0, top);
  const fused = rrf([semRank.map(String), kwRank.map(String)]);
  return [...fused.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([i]) => docs[Number(i)]!);
}
