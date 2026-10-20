/**
 * NCERT Biology chapter list (rationalised textbooks, 2023-24 onward) — shared by the
 * deep-NCERT voice quiz and the transcript formatter so chapter names always show exactly.
 */
export const NCERT_BIOLOGY_EDITION = "NCERT rationalised edition (2023-24 onward)";

export type NcertChapter = { cls: 11 | 12; no: number; name: string; unit: string };

const CLASS_11: Array<[string, string]> = [
  ["The Living World", "Diversity in the Living World"],
  ["Biological Classification", "Diversity in the Living World"],
  ["Plant Kingdom", "Diversity in the Living World"],
  ["Animal Kingdom", "Diversity in the Living World"],
  ["Morphology of Flowering Plants", "Structural Organisation in Plants and Animals"],
  ["Anatomy of Flowering Plants", "Structural Organisation in Plants and Animals"],
  ["Structural Organisation in Animals", "Structural Organisation in Plants and Animals"],
  ["Cell: The Unit of Life", "Cell: Structure and Function"],
  ["Biomolecules", "Cell: Structure and Function"],
  ["Cell Cycle and Cell Division", "Cell: Structure and Function"],
  ["Photosynthesis in Higher Plants", "Plant Physiology"],
  ["Respiration in Plants", "Plant Physiology"],
  ["Plant Growth and Development", "Plant Physiology"],
  ["Breathing and Exchange of Gases", "Human Physiology"],
  ["Body Fluids and Circulation", "Human Physiology"],
  ["Excretory Products and their Elimination", "Human Physiology"],
  ["Locomotion and Movement", "Human Physiology"],
  ["Neural Control and Coordination", "Human Physiology"],
  ["Chemical Coordination and Integration", "Human Physiology"],
];

const CLASS_12: Array<[string, string]> = [
  ["Sexual Reproduction in Flowering Plants", "Reproduction"],
  ["Human Reproduction", "Reproduction"],
  ["Reproductive Health", "Reproduction"],
  ["Principles of Inheritance and Variation", "Genetics and Evolution"],
  ["Molecular Basis of Inheritance", "Genetics and Evolution"],
  ["Evolution", "Genetics and Evolution"],
  ["Human Health and Disease", "Biology in Human Welfare"],
  ["Microbes in Human Welfare", "Biology in Human Welfare"],
  ["Biotechnology: Principles and Processes", "Biotechnology"],
  ["Biotechnology and its Applications", "Biotechnology"],
  ["Organisms and Populations", "Ecology"],
  ["Ecosystem", "Ecology"],
  ["Biodiversity and Conservation", "Ecology"],
];

export const NCERT_BIOLOGY_CHAPTERS: NcertChapter[] = [
  ...CLASS_11.map(([name, unit], i) => ({ cls: 11 as const, no: i + 1, name, unit })),
  ...CLASS_12.map(([name, unit], i) => ({ cls: 12 as const, no: i + 1, name, unit })),
];

export function ncertChapter(cls: number, no: number): NcertChapter | undefined {
  return NCERT_BIOLOGY_CHAPTERS.find((c) => c.cls === cls && c.no === no);
}

/** "NCERT Class 11 Biology · Chapter 5 — Morphology of Flowering Plants" */
export function chapterLabel(c: NcertChapter): string {
  return `NCERT Class ${c.cls} Biology · Chapter ${c.no} — ${c.name}`;
}

const SPOKEN: Record<string, number> = {
  one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4, chaar: 4, five: 5, paanch: 5, panch: 5,
  six: 6, chhe: 6, che: 6, seven: 7, saat: 7, eight: 8, aath: 8, nine: 9, nau: 9, ten: 10, das: 10,
  eleven: 11, gyarah: 11, twelve: 12, barah: 12, thirteen: 13, terah: 13, fourteen: 14, chaudah: 14,
  fifteen: 15, pandrah: 15, sixteen: 16, solah: 16, seventeen: 17, satrah: 17, eighteen: 18, atharah: 18,
  nineteen: 19, unnis: 19,
};

const spokenNumber = (s: string) => (/^\d+$/.test(s) ? Number(s) : SPOKEN[s.toLowerCase()]);

const nameRe = (name: string) => name.split(/[^A-Za-z0-9]+/).filter(Boolean).join("[^A-Za-z0-9]+");

const MENTION = /(?:\b(?:Yeh|Ye|This|Is)\s+(?:question|sawal|sawaal|prashn|prashna)\s+)?\b(?:NCERT\s+)?Class\s+(11|12|eleven|twelve|gyarah|barah)(?:\s+(?:Biology|Bio))?\s*[·,:\-–—]?\s*(?:Chapter|Ch\.?|adhyay)\s*(\d{1,2}|[a-z]+)\b\s*[·,:\-–—]?\s*/i;

/**
 * Find a spoken/written "NCERT Class 11 Biology, Chapter 5, Morphology…" mention, remove it
 * from the text and return the official chapter. A spoken chapter name wins over a misspoken number.
 */
export function takeChapter(text: string): { text: string; chapter: NcertChapter | null } {
  const m = text.match(MENTION);
  if (!m || m.index === undefined) return { text, chapter: null };
  const cls = spokenNumber(m[1] ?? "") === 12 ? 12 : 11;
  let rest = text.slice(m.index + m[0].length);
  let chapter = ncertChapter(cls, spokenNumber(m[2] ?? "") ?? 0) ?? null;
  for (const c of NCERT_BIOLOGY_CHAPTERS.filter((x) => x.cls === cls).sort((a, b) => b.name.length - a.name.length)) {
    const named = rest.match(new RegExp(`^["“]?${nameRe(c.name)}["”]?`, "i"));
    if (named) { chapter = c; rest = rest.slice(named[0].length); break; }
  }
  if (!chapter) return { text, chapter: null };
  rest = rest.replace(/^\s*(?:chapter\s+)?(?:se|mein|me|from)?\s*(?:hai|tha|hain)?\s*[.,:;!—–-]?\s*/i, "");
  const before = text.slice(0, m.index).replace(/\s*[(\[]?$/, "");
  return { text: [before, rest].filter((s) => s.trim()).join(before && rest ? " " : "").trim(), chapter };
}
