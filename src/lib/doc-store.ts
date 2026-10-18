import type { UIMessage } from "ai";

/** Large PDFs live in IndexedDB; saved messages keep only an "idb:<id>" pointer. */
const DB = "snapsolve-docs";
const STORE = "docs";
const ids = new Map<string, string>(); // dataUrl -> id

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function put(id: string, data: string) {
  const db = await open();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(data, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function get(id: string): Promise<string | undefined> {
  const db = await open();
  return new Promise((res) => {
    const r = db.transaction(STORE).objectStore(STORE).get(id);
    r.onsuccess = () => res(r.result as string | undefined);
    r.onerror = () => res(undefined);
  });
}

const isDoc = (p: { type: string; mediaType?: string; url?: string }) =>
  p.type === "file" && p.mediaType === "application/pdf";

/** Replace PDF data with pointers (saving the data to IndexedDB). */
export function stripDocs(messages: UIMessage[]): UIMessage[] {
  return messages.map((m) => ({
    ...m,
    parts: m.parts.map((p) => {
      if (!isDoc(p) || !("url" in p) || !p.url.startsWith("data:")) return p;
      let id = ids.get(p.url);
      if (!id) {
        id = crypto.randomUUID();
        ids.set(p.url, id);
        void put(id, p.url).catch(() => {});
      }
      return { ...p, url: `idb:${id}` };
    }),
  }));
}

/** Put PDF data back into messages loaded from storage. */
export async function restoreDocs(messages: UIMessage[]): Promise<UIMessage[]> {
  return Promise.all(
    messages.map(async (m) => ({
      ...m,
      parts: await Promise.all(
        m.parts.map(async (p) => {
          if (!isDoc(p) || !("url" in p) || !p.url.startsWith("idb:")) return p;
          const id = p.url.slice(4);
          const data = await get(id).catch(() => undefined);
          if (!data) return { type: "text" as const, text: `[PDF "${("filename" in p && p.filename) || "document"}" is no longer available]` };
          ids.set(data, id);
          return { ...p, url: data };
        }),
      ),
    })),
  );
}
