import type { StudioToolId } from './studio-tools';

/** AI Studio results saved in this browser (IndexedDB): diagrams, animations and enhance jobs. */
export type StudioItemStatus = 'queued' | 'in_progress' | 'completed' | 'failed';

export type StudioItem = {
  id: string;
  tool: StudioToolId;
  title: string;
  createdAt: number;
  status: StudioItemStatus;
  progress: number;
  /** Gateway video job id (animation / enhance). */
  jobId?: string;
  /** When the provider deletes the finished video (ms). */
  expiresAt?: number | null;
  credits?: number | null;
  error?: string | null;
  /** Diagram/poster image as a data URL. */
  image?: string;
  /** Finished animation saved on this device. */
  video?: Blob;
  /** Temporary upload of the source clip (enhance), removed once the job ends. */
  uploadPath?: string;
  detail?: string;
};

const DB = 'snapsolve-studio';
const STORE = 'items';
export const STUDIO_EVENT = 'snapsolve:studio';
export const STUDIO_MAX_ITEMS = 40;

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((res, rej) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  } finally {
    db.close();
  }
}

const notify = () => window.dispatchEvent(new Event(STUDIO_EVENT));

export async function listStudioItems(): Promise<StudioItem[]> {
  const all = (await tx<StudioItem[]>('readonly', s => s.getAll() as IDBRequest<StudioItem[]>)) ?? [];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/** Saves an item; keeps only the newest STUDIO_MAX_ITEMS so the device never fills up. */
export async function saveStudioItem(item: StudioItem) {
  await tx('readwrite', s => { s.put(item); });
  const all = await listStudioItems();
  const extra = all.slice(STUDIO_MAX_ITEMS).filter(i => i.status === 'completed' || i.status === 'failed');
  if (extra.length) await tx('readwrite', s => { for (const i of extra) s.delete(i.id); });
  notify();
}

export async function patchStudioItem(id: string, patch: Partial<StudioItem>) {
  const current = await tx<StudioItem>('readonly', s => s.get(id) as IDBRequest<StudioItem>);
  if (!current) return;
  await saveStudioItem({ ...current, ...patch });
}

export async function deleteStudioItem(id: string) {
  await tx('readwrite', s => { s.delete(id); });
  notify();
}

export const isPendingItem = (i: StudioItem) => (i.status === 'queued' || i.status === 'in_progress') && !!i.jobId;
