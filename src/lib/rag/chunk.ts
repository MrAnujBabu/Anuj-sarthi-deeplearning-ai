/** Splits extracted textbook text (with [Page N] markers) into overlapping chunks for the offline NCERT library. */
export type RagChunk = { page: number; text: string };

const DEFAULT_TARGET = 900;
const DEFAULT_MAX = 1200;
const DEFAULT_OVERLAP = 120;

/** Splits a long paragraph at sentence boundaries so no chunk exceeds max. */
function hardSplit(text: string, max: number): string[] {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const window = rest.slice(0, max);
    const cut = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "), window.lastIndexOf("\n"));
    const at = cut > max / 2 ? cut + 1 : max;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

/**
 * Chunks text at paragraph boundaries, tracking [Page N] markers.
 * Each chunk carries the page it started on; consecutive chunks overlap by ~overlap chars.
 */
export function chunkText(
  raw: string,
  opts?: { target?: number; max?: number; overlap?: number },
): RagChunk[] {
  const target = opts?.target ?? DEFAULT_TARGET;
  const max = opts?.max ?? DEFAULT_MAX;
  const overlap = opts?.overlap ?? DEFAULT_OVERLAP;

  // Split into page segments, keeping the page number with each segment.
  const segments: { page: number; body: string }[] = [];
  const re = /\[Page (\d+)\]/g;
  let m: RegExpExecArray | null;
  let last = 0;
  let page = 0;
  while ((m = re.exec(raw))) {
    if (m.index > last && page > 0) segments.push({ page, body: raw.slice(last, m.index) });
    page = Number(m[1]);
    last = m.index + m[0].length;
  }
  if (last < raw.length) segments.push({ page, body: raw.slice(last) });

  const chunks: RagChunk[] = [];
  let current = "";
  let currentPage = 0;
  const flush = () => {
    const t = current.trim();
    if (t) chunks.push({ page: currentPage, text: t });
    current = "";
  };

  for (const seg of segments) {
    const paragraphs = seg.body.split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
    for (const para of paragraphs) {
      const pieces = para.length > max ? hardSplit(para, max) : [para];
      for (const piece of pieces) {
        if (!current) currentPage = seg.page;
        if (current && current.length + piece.length + 1 > target) {
          const tail = current.slice(-overlap).trim();
          const donePage = currentPage;
          flush();
          current = tail ? `${tail} ${piece}` : piece;
          currentPage = donePage;
        } else {
          current = current ? `${current} ${piece}` : piece;
        }
      }
    }
  }
  flush();

  // Drop exact duplicates (repeated headers/footers across pages).
  const seen = new Set<string>();
  return chunks.filter((c) => {
    if (seen.has(c.text)) return false;
    seen.add(c.text);
    return c.text.length >= 40;
  });
}
