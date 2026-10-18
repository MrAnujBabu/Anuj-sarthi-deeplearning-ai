export type MemoryRow = {
  title: string;
  category: string;
  subject: string;
  chapter: string;
  content: string;
  kind: string;
  tracker_type: string | null;
  frequency: number;
};

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9\u0900-\u097f]{3,}/g) ?? []);

/** Pick memory most relevant to the question and format it, never exceeding `cap` characters. */
export function buildTeacherMemory(rows: MemoryRow[], query: string, cap = 24000): string {
  const q = words(query);
  const scored = rows.map((r) => {
    const head = words(`${r.title} ${r.subject} ${r.chapter} ${r.category}`);
    let score = 0;
    for (const w of head) if (q.has(w)) score += 3;
    for (const w of words(r.content.slice(0, 4000))) if (q.has(w)) score += 1;
    if (r.kind === "tracker") score += 2 + Math.min(r.frequency, 5);
    if (r.category === "Syllabus") score += 2;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  let out = "";
  for (const { r } of scored) {
    const label = r.kind === "tracker" ? `${(r.tracker_type ?? "note").replace("_", " ")} x${r.frequency}` : r.category;
    const block = `### ${r.title} [${label}${r.subject ? ` · ${r.subject}` : ""}${r.chapter ? ` · ${r.chapter}` : ""}]\n${r.content.trim()}\n\n`;
    const room = cap - out.length;
    if (room < 200) break;
    out += block.length > room ? block.slice(0, room - 4) + "…\n\n" : block;
  }
  return out.trim();
}
