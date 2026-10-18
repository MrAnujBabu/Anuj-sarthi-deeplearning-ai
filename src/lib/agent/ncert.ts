/** Browser-safe NCERT helpers shared by the agent tools and tests. */
export const NCERT_BOOKS: Record<string, { label: string; codes: string[] }> = {
  "11-physics": { label: "NCERT Class 11 Physics", codes: ["keph1", "keph2"] },
  "12-physics": { label: "NCERT Class 12 Physics", codes: ["leph1", "leph2"] },
  "11-chemistry": { label: "NCERT Class 11 Chemistry", codes: ["kech1", "kech2"] },
  "12-chemistry": { label: "NCERT Class 12 Chemistry", codes: ["lech1", "lech2"] },
  "11-biology": { label: "NCERT Class 11 Biology", codes: ["kebo1"] },
  "12-biology": { label: "NCERT Class 12 Biology", codes: ["lebo1"] },
};

export function bookKey(cls: number, subject: string) {
  return `${cls}-${subject.toLowerCase()}`;
}

export function textbookUrl(cls: number, subject: string) {
  const book = NCERT_BOOKS[bookKey(cls, subject)];
  return book ? `https://ncert.nic.in/textbook.php?${book.codes[0]}=0-` : "https://ncert.nic.in/textbook.php";
}

/** Only NCERT hosts may be read by the ncert_read tool. */
export function isNcertUrl(url: string) {
  try {
    const h = new URL(url).hostname;
    return h === "ncert.nic.in" || h.endsWith(".ncert.nic.in");
  } catch {
    return false;
  }
}

export const MAX_TOOL_CALLS = 4;

export function trim(text: string, max = 3000) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}
