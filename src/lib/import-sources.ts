/** Study item types the admin can save alongside notes/links/files/tracker. */
export const STUDY_KINDS = [
  { id: 'fact', label: 'Fact', template: 'Fact: \nWhy it matters: ' },
  { id: 'assertion_reason', label: 'Assertion-Reason', template: 'Assertion (A): \nReason (R): \nAnswer: (A/B/C/D)\nExplanation: ' },
  { id: 'insight', label: 'Insight', template: 'Insight: \nExample: ' },
  { id: 'teacher_question', label: "Teacher's question", template: 'Question: \nAnswer: \nExplanation: ' },
  { id: 'mistake_question', label: 'Mistake question', template: 'Question: \nMeri galti: \nSahi approach: ' },
  { id: 'flashcard', label: 'Flashcard', template: 'Front: \nBack: ' },
  { id: 'active_recall', label: 'Active recall', template: 'Prompt: \nExpected answer: ' },
  { id: 'pyq', label: 'PYQ', template: 'Year: \nQuestion: \nOptions: \nAnswer: \nExplanation: ' },
  { id: 'fyq', label: 'FYQ', template: 'Question: \nAnswer: \nKitni baar aata hai: ' },
  { id: 'wisdom', label: 'Life & study library', template: 'Kisne sikhaya (teacher/lecture/khud): \nSeekh: \nKab use karna hai (revision / test / mistake / life): ' },
] as const;
export type StudyKind = (typeof STUDY_KINDS)[number]['id'];
export const BASE_KINDS = ['note', 'link', 'file', 'tracker'] as const;
export const ALL_KINDS = [...BASE_KINDS, ...STUDY_KINDS.map(k => k.id)] as const;
export type MemoryKind = (typeof ALL_KINDS)[number];
export const isStudyKind = (k: string): k is StudyKind => STUDY_KINDS.some(s => s.id === k);

/** Converts public Google Drive / Sheets / Docs share links into direct download URLs. */
export function directImportUrl(raw: string): { url: string; source: 'sheets' | 'drive' | 'docs' | 'web' } {
  const u = new URL(raw);
  if (u.hostname === 'docs.google.com') {
    const sheet = u.pathname.match(/\/spreadsheets\/d\/([\w-]+)/);
    if (sheet) {
      const gid = u.searchParams.get('gid') ?? u.hash.match(/gid=(\d+)/)?.[1];
      return { url: `https://docs.google.com/spreadsheets/d/${sheet[1]}/export?format=csv${gid ? `&gid=${gid}` : ''}`, source: 'sheets' };
    }
    const doc = u.pathname.match(/\/document\/d\/([\w-]+)/);
    if (doc) return { url: `https://docs.google.com/document/d/${doc[1]}/export?format=txt`, source: 'docs' };
  }
  if (u.hostname === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get('id');
    if (id) return { url: `https://drive.google.com/uc?export=download&id=${id}`, source: 'drive' };
  }
  return { url: u.toString(), source: 'web' };
}

/** RFC4180-style CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delimiter) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim()));
}

export type ImportedRow = { kind: StudyKind; title: string; subject: string; chapter: string; content: string; source_url?: string | null };
const FIELDS = ['question', 'options', 'answer', 'explanation', 'year'] as const;

/** Header row decides columns; each later row becomes one study item. */
export function csvToStudyItems(text: string, fallbackKind: StudyKind): ImportedRow[] {
  const [head, ...rows] = parseCsv(text.replace(/^\uFEFF/, ''));
  if (!head) return [];
  const h = head.map(x => x.trim().toLowerCase());
  const col = (r: string[], ...names: string[]) => { for (const n of names) { const i = h.indexOf(n); if (i >= 0 && r[i]?.trim()) return r[i].trim(); } return ''; };
  return rows.map(r => {
    const t = col(r, 'type', 'kind').toLowerCase().replace(/[\s-']+/g, '_');
    const kind = isStudyKind(t) ? t : fallbackKind;
    const question = col(r, 'question', 'front', 'fact', 'assertion', 'prompt', 'title') || r[0]?.trim() || '';
    const lines = FIELDS.filter(f => f !== 'question').map(f => [f, col(r, f, f === 'answer' ? 'back' : f)] as const).filter(([, v]) => v);
    const extra = h.map((name, i) => [name, r[i]?.trim() ?? ''] as const).filter(([n, v]) => v && !['type', 'kind', 'subject', 'chapter', 'question', 'front', 'back', 'fact', 'assertion', 'prompt', 'title', ...FIELDS].includes(n));
    const content = [`Question: ${question}`, ...[...lines, ...extra].map(([k, v]) => `${k.charAt(0).toUpperCase()}${k.slice(1)}: ${v}`)].join('\n');
    const source = col(r, 'source_url', 'source');
    if (source && !/^https?:\/\//i.test(source)) throw new Error('Source must be an http(s) link.');
    return { kind, title: question.slice(0, 200), subject: col(r, 'subject'), chapter: col(r, 'chapter'), content, source_url: source || null };
  }).filter(i => i.title);
}

export const ADMIN_LINK_CAP = 400_000;
export function capText(text: string, cap = ADMIN_LINK_CAP) {
  return { text: text.slice(0, cap), truncated: text.length > cap, chars: Math.min(text.length, cap), totalChars: text.length };
}

export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export function validateImportSize(size: number) {
  if (size > MAX_IMPORT_BYTES) throw new Error('File exceeds 25 MB. Split it into smaller parts.');
}

/** Anki exported raw notes: tab-separated Front/Back/Tags, directives, or JSON notes. No packages/media. */
export function ankiToStudyItems(text: string): ImportedRow[] {
  const make = (front: unknown, back: unknown, tags: unknown = ''): ImportedRow => {
    if (typeof front !== 'string' || typeof back !== 'string') throw new Error('Anki notes need string front/back fields.');
    return { kind: 'flashcard', title: front.slice(0, 200), subject: '', chapter: '', content: `Front: ${front}\nBack: ${back}${tags ? `\nTags: ${Array.isArray(tags) ? tags.join(' ') : String(tags)}` : ''}` };
  };
  const raw = text.replace(/^\uFEFF/, '').trim();
  if (/^[\[{]/.test(raw)) {
    const data = JSON.parse(raw);
    const notes = Array.isArray(data) ? data : data.notes;
    if (!Array.isArray(notes)) throw new Error('Anki JSON must be an array or an object with notes.');
    return notes.map(n => make(n.front ?? n.fields?.[0], n.back ?? n.fields?.[1] ?? '', n.tags)).filter(n => n.title.trim());
  }
  const lines = raw.split(/\r?\n/);
  const separator = lines.find(l => /^#separator:/i.test(l))?.split(':')[1]?.trim().toLowerCase();
  if (separator && !['tab', 'comma', 'semicolon'].includes(separator)) throw new Error('Supported Anki separators: Tab, Comma, Semicolon.');
  const rows = parseCsv(lines.filter(l => !l.startsWith('#')).join('\n'), separator === 'comma' ? ',' : separator === 'semicolon' ? ';' : '\t');
  if (rows[0]?.[0]?.toLowerCase() === 'front' && rows[0]?.[1]?.toLowerCase() === 'back') rows.shift();
  return rows.map(r => { if (r.length < 2) throw new Error('Anki text requires Front and Back separated by a tab.'); return make(r[0], r[1], r[2]); });
}
