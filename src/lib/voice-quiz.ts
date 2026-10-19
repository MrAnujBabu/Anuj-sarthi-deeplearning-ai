export const VOICE_ANSWERS = ["A", "B", "C", "D"];

/** Read a complete spoken/written MCQ; incomplete captions never enable answers. */
export function voiceQuizOptions(text: string): Record<string, string> | null {
  const matches = [...text.matchAll(/(?:^|\s)(?:option\s+)?\(?([A-D])(?:\)|[.:])\s+/gi)];
  if (matches.length !== 4 || matches.some((m, i) => m[1]?.toUpperCase() !== VOICE_ANSWERS[i])) return null;
  const labels: Record<string, string> = {};
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (!m || m.index === undefined) return null;
    const label = text.slice(m.index + m[0].length, matches[i + 1]?.index ?? text.length).trim();
    if (!label) return null;
    labels[VOICE_ANSWERS[i] ?? ""] = label;
  }
  return labels;
}

export function validVoiceAnswer(value: unknown): value is string {
  return typeof value === "string" && VOICE_ANSWERS.includes(value);
}