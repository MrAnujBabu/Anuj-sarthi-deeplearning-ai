import type { FileUIPart, UIMessage } from "ai";

export type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

const KEY = "snapsolve.threads.v1";

export function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Thread[]) : [];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function saveThreads(threads: Thread[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(threads));
    window.dispatchEvent(new Event("snapsolve:threads"));
    return true;
  } catch {
    return false;
  }
}

export function getThread(id: string): Thread | undefined {
  return loadThreads().find((t) => t.id === id);
}

export function upsertThread(thread: Thread): boolean {
  const others = loadThreads().filter((t) => t.id !== thread.id);
  let list = [thread, ...others];
  // If storage is full, drop the oldest doubts until it fits.
  while (!saveThreads(list) && list.length > 1) list = list.slice(0, -1);
  return list.length > 0;
}

export function deleteThread(id: string) {
  saveThreads(loadThreads().filter((t) => t.id !== id));
}

export function titleFrom(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const text = first?.parts.find((p) => p.type === "text") as { text?: string } | undefined;
  const t = text?.text?.trim();
  if (t) return t.length > 60 ? t.slice(0, 57) + "…" : t;
  return "Snapped doubt";
}

// First message handed from the home page to a freshly created doubt page.
export const pendingFirstMessage = new Map<string, { text: string; files: FileUIPart[]; mode?: "quiz" | "solve" }>();

/** Shrink a photo so it uploads fast and fits in browser storage. */
export async function compressImage(file: FileUIPart, maxSide = 1400): Promise<FileUIPart> {
  if (!file.mediaType?.startsWith("image/") || typeof document === "undefined") return file;
  const img = new Image();
  img.src = file.url;
  await img.decode();
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { ...file, mediaType: "image/jpeg", url: canvas.toDataURL("image/jpeg", 0.82) };
}
