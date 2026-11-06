const norm = (v: string) => v.replace(/[\s।.,!?'"“”‘’\-–—:;()]+/g, '').toLowerCase();
const sentences = (v: string) => (v.replace(/\s+/g, ' ').match(/[^।.!?]+[।.!?]*/g) ?? []).map(s => s.trim()).filter(Boolean);

/** True when a Hindi voice line is the same as the one just before it (ignoring spaces and punctuation). */
export function isRepeatedLine(text: string, previous: string | undefined) {
  const a = norm(text);
  return a.length > 0 && previous !== undefined && a === norm(previous);
}

/** Text to speak with back-to-back duplicate sentences removed, including a first sentence that repeats the previous part's last one. */
export function speakableText(text: string, previous?: string) {
  let last = previous ? norm(sentences(previous).at(-1) ?? '') : '';
  const kept: string[] = [];
  for (const s of sentences(text)) {
    const n = norm(s);
    if (!n || n === last) continue;
    kept.push(s); last = n;
  }
  return kept.join(' ');
}
