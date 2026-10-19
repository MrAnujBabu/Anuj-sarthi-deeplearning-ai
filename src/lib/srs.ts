/** Spaced-repetition deck (Leitner boxes) saved in this browser. */
export type Card = {
  id: string;
  q: string;
  a: string;
  topic: string;
  box: number; // 1..5
  due: number; // epoch ms
  reviews: number;
  lastCorrect: boolean;
};

export type CardResult = { id?: string; q: string; a: string; topic?: string; correct: boolean };

const KEY = "snapsolve.cards.v1";
const DAY = 24 * 60 * 60 * 1000;
/** Days until next review for each box. */
export const BOX_DAYS = [1, 3, 7, 14, 30];

export function cardId(q: string) {
  const s = q.toLowerCase().replace(/\s+/g, " ").trim();
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "c" + (h >>> 0).toString(36);
}

/** Correct → move up one box; wrong → back to box 1. */
export function schedule(prevBox: number | undefined, correct: boolean, now: number) {
  const box = correct ? Math.min(5, (prevBox ?? 0) + 1) : 1;
  return { box, due: now + (BOX_DAYS[box - 1] ?? 1) * DAY };
}

const CARD_RE = /<!--\s*card\s*([\s\S]*?)-->/g;

export function parseCards(text: string): CardResult[] {
  const out: CardResult[] = [];
  for (const m of text.matchAll(CARD_RE)) {
    try {
      const c = JSON.parse((m[1] ?? "").trim());
      if (typeof c.q === "string" && typeof c.correct === "boolean") out.push(c);
    } catch {
      /* ignore malformed tag */
    }
  }
  return out;
}

/** Hide card tags (including one still streaming) from what the student sees. */
export function stripCards(text: string) {
  return text
    .replace(/<!--\s*(card|quiz)[\s\S]*?(-->|$)/g, "")
    .replace(/<!-?-?\s*$/, "")
    .replace(/\n{3,}/g, "\n\n");
}

/** Options the latest quiz question offers as tap buttons, or null when no question is open. */
export function parseQuizTag(text: string): string[] | null {
  const all = [...text.matchAll(/<!--\s*quiz\s*([\s\S]*?)-->/g)];
  const last = all[all.length - 1];
  if (!last) return null;
  try {
    const v = JSON.parse((last[1] ?? "").trim());
    return Array.isArray(v.options) ? v.options.filter((o: unknown) => typeof o === "string").slice(0, 6) : [];
  } catch {
    return null;
  }
}

export function loadCards(): Card[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function save(cards: Card[]) {
  localStorage.setItem(KEY, JSON.stringify(cards));
  window.dispatchEvent(new Event("snapsolve:cards"));
}

export function applyResults(cards: Card[], results: CardResult[], now: number): Card[] {
  const map = new Map(cards.map((c) => [c.id, c]));
  for (const r of results) {
    const id = r.id && map.has(r.id) ? r.id : cardId(r.q);
    const prev = map.get(id);
    const s = schedule(prev?.box, r.correct, now);
    map.set(id, {
      id,
      q: prev?.q ?? r.q,
      a: r.a || prev?.a || "",
      topic: r.topic || prev?.topic || "General",
      ...s,
      reviews: (prev?.reviews ?? 0) + 1,
      lastCorrect: r.correct,
    });
  }
  return [...map.values()];
}

/** Records results once per assistant message. */
export function recordResults(messageId: string, results: CardResult[]) {
  if (!results.length) return;
  const seenKey = "snapsolve.cards.seen";
  let seen: string[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(seenKey) ?? '[]');
    if (Array.isArray(parsed)) seen = parsed.filter((id): id is string => typeof id === 'string');
  } catch { /* Recover a damaged message index without crashing the tutor. */ }
  if (seen.includes(messageId)) return;
  save(applyResults(loadCards(), results, Date.now()));
  localStorage.setItem(seenKey, JSON.stringify([...seen, messageId].slice(-500)));
}

export function dueCards(cards: Card[], now: number) {
  return cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
}

export function revisionPrompt(cards: Card[]) {
  const list = cards
    .slice(0, 10)
    .map((c, i) => `${i + 1}. [id:${c.id}] (${c.topic}) ${c.q}\n   Correct: ${c.a}`)
    .join("\n");
  return `Spaced-repetition revision: ye ${Math.min(cards.length, 10)} sawaal aaj revise karne hain. Ek-ek karke poochho (answer mat batana), mere jawab ko check karo, aur card tag mein wahi id use karo.\n\n${list}`;
}

/** Local recall grading never calls AI. */
export function reviewLocalCard(card: Card, correct: boolean, now: number) {
  const cards = loadCards();
  const next = applyResults(cards.some(c => c.id === card.id) ? cards : [...cards, card], [{...card, correct}], now);
  save(next);
  return next;
}
