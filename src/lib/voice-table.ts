/** Shared spoken protocol: browser display and the live tutor use the same contract. */
export const VOICE_TABLE_GUIDANCE = `For any requested table, choose the column names and number of rows from the student's question, not a fixed template. Speak: 'Table: Part, Bones aur Location. Row: Skull; 22; Head. Row: Ribs; 24; Chest. Table khatam.' Use any two or more columns, comma-separated headers with 'aur' before the last; say 'Row:' before each row and separate cells with semicolons. Keep exactly one cell per header and each row in its own sentence. Decimal values like 2.5 stay intact. For comparisons you can use 'Tulna: X aur Y. Feature — X: value, Y: value. Tulna khatam.' The screen really draws these patterns as tables; never say you cannot make a table or ask the student to draw it. Never invent missing facts to fill cells; say 'not given'.`;

export type SpokenTable = { before: string; table: string; after: string };

export function spokenTableColumns(header: string): string[] {
  return header.split(/\s*,\s*|\s+(?:aur|and|vs\.?|versus|और)\s+/i).map((cell) => cell.trim()).filter(Boolean);
}

/** Explicit row boundaries avoid guessing whether commas/decimals are data or separators. */
export function dynamicVoiceTable(text: string): SpokenTable | null {
  const head = /(?:\bTable|टेबल|तालिका)\s*:\s*([^.!?\n]+)[.!?]\s*/i.exec(text);
  if (!head) return null;
  const columns = spokenTableColumns(head[1] ?? '');
  if (columns.length < 2) return null;
  const start = head.index + head[0].length;
  const rest = text.slice(start);
  const end = /(?:\bTable\s+(?:khatam|end|over)|(?:टेबल|तालिका)\s*(?:खत्म|समाप्त))[.!?]?/i.exec(rest);
  const body = end ? rest.slice(0, end.index) : rest;
  const markers = [...body.matchAll(/(?:\bRow|पंक्ति|रो)\s*:\s*/gi)];
  if (!markers.length) return null;
  const escape = (cell: string) => cell.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
  const rows: string[][] = [];
  let tail = body.slice(0, markers[0]?.index ?? 0).trim();
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    if (!marker || marker.index === undefined) continue;
    const chunk = body.slice(marker.index + marker[0].length, markers[i + 1]?.index ?? body.length).trim();
    // Do not display a partially spoken final cell as a completed row.
    if (!/[.!?।]$/.test(chunk)) { tail += ` ${body.slice(marker.index)}`; break; }
    const cells = chunk.replace(/[.!?।]$/, '').split(/\s*;\s*/);
    if (cells.length !== columns.length || cells.some((cell) => !cell.trim())) {
      tail += ` ${body.slice(marker.index)}`;
      break;
    }
    rows.push(cells.map(escape));
  }
  if (rows.length < 2) return null;
  return {
    before: text.slice(0, head.index).trim(),
    table: [`| ${columns.map(escape).join(' | ')} |`, `|${'---|'.repeat(columns.length)}`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n'),
    after: [tail.trim(), end ? rest.slice(end.index + end[0].length).trim() : ''].filter(Boolean).join(' '),
  };
}