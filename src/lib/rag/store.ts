/** Device-stored offline NCERT library + PYQ bank (IndexedDB). Vectors never leave the device. */
import { hybridSearch } from "./hybrid";
export type RagChunkRecord = {
  id: string;
  book: string; // e.g. "11-biology"
  chapter: string;
  page: number;
  text: string;
  vector: number[];
};

export type PyqRecord = {
  id: string;
  year: number;
  subject: string;
  chapter: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  source: string;
};

const DB = "snapsolve-rag";
const VERSION = 1;
const CHUNKS = "chunks";
const PYQS = "pyqs";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(CHUNKS)) {
        db.createObjectStore(CHUNKS, { keyPath: "id" }).createIndex("book", "book");
      }
      if (!db.objectStoreNames.contains(PYQS)) {
        db.createObjectStore(PYQS, { keyPath: "id" }).createIndex("subject", "subject");
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function withStore<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); res(req.result); };
    tx.onerror = () => { db.close(); rej(tx.error); };
    tx.onabort = () => { db.close(); rej(tx.error); };
  });
}

async function getAll<T>(store: string): Promise<T[]> {
  return withStore(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export async function addChunks(records: RagChunkRecord[]): Promise<number> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(CHUNKS, "readwrite");
    const s = tx.objectStore(CHUNKS);
    for (const r of records) s.put(r);
    tx.oncomplete = () => { db.close(); res(records.length); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}

/** Top-k chunks by hybrid search (BM25 + vectors, RRF-fused); optionally restricted to one book. */
export async function searchRag(query: string, queryVector: number[], k = 5, book?: string): Promise<RagChunkRecord[]> {
  let all = await getAll<RagChunkRecord>(CHUNKS);
  if (book) all = all.filter((c) => c.book === book);
  return hybridSearch(query, queryVector, all, k);
}

export async function ragStats(): Promise<{ book: string; chapters: number; count: number }[]> {
  const all = await getAll<RagChunkRecord>(CHUNKS);
  const by = new Map<string, { chapters: Set<string>; count: number }>();
  for (const c of all) {
    const e = by.get(c.book) ?? { chapters: new Set<string>(), count: 0 };
    e.chapters.add(c.chapter);
    e.count += 1;
    by.set(c.book, e);
  }
  return [...by.entries()].map(([book, e]) => ({ book, chapters: e.chapters.size, count: e.count })).sort((a, b) => a.book.localeCompare(b.book));
}

export async function clearRagBook(book: string): Promise<void> {
  const all = await getAll<RagChunkRecord>(CHUNKS);
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(CHUNKS, "readwrite");
    const s = tx.objectStore(CHUNKS);
    for (const c of all) if (c.book === book) s.delete(c.id);
    tx.oncomplete = () => { db.close(); res(); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}

export async function clearRagAll(): Promise<void> {
  await withStore(CHUNKS, "readwrite", (s) => s.clear());
}

// ---- PYQ bank ----

export async function addPyqs(records: PyqRecord[]): Promise<number> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(PYQS, "readwrite");
    const s = tx.objectStore(PYQS);
    for (const r of records) s.put(r);
    tx.oncomplete = () => { db.close(); res(records.length); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "which", "what", "when", "kya", "hai", "ka", "ki", "ke"]);

function keywords(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\u0900-\u097F ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));
}

/** Keyword-overlap search over the PYQ bank (no embedding needed for a few thousand rows). */
export async function searchPyqs(query: string, k = 3): Promise<PyqRecord[]> {
  const q = keywords(query);
  if (!q.size) return [];
  const all = await getAll<PyqRecord>(PYQS);
  return all
    .map((p) => {
      const words = keywords(`${p.question} ${p.chapter} ${p.subject}`);
      let score = 0;
      for (const w of q) if (words.has(w)) score += 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || y.p.year - x.p.year)
    .slice(0, k)
    .map((x) => x.p);
}

export async function pyqStats(): Promise<{ count: number; years: number[] }> {
  const all = await getAll<PyqRecord>(PYQS);
  return { count: all.length, years: [...new Set(all.map((p) => p.year))].sort((a, b) => b - a) };
}

export async function clearPyqs(): Promise<void> {
  await withStore(PYQS, "readwrite", (s) => s.clear());
}
