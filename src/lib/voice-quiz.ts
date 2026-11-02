export const VOICE_ANSWERS = ["A", "B", "C", "D"];

/**
 * Read a complete spoken/written MCQ; incomplete captions never enable answers.
 * Accepts "A." / "(A)" / "A)" letter markers and NEET-style "(1)"–"(4)" / "1)" markers,
 * inline or on separate lines. Uses the last complete A→D run so a stray "Vitamin A."
 * in the question cannot break option detection.
 */
export function voiceQuizOptions(text: string): Record<string, string> | null {
  const clean = text.replace(/\*\*/g, "");
  const patterns = [
    /(?:^|\s)(?:option\s+)?\(?([A-D])(?:\)|[.:])\s+/gi,
    /(?:^|\s)(?:option\s+)?(?:\(([1-4])\)|([1-4])\))\s+/gi,
  ];
  for (const re of patterns) {
    const matches = [...clean.matchAll(re)].map((m) => {
      const raw = (m[1] ?? m[2] ?? "").toUpperCase();
      const letter = /^[1-4]$/.test(raw) ? VOICE_ANSWERS[Number(raw) - 1] : raw;
      return { letter, index: m.index ?? 0, length: m[0].length };
    });
    for (let i = matches.length - 4; i >= 0; i--) {
      const run = matches.slice(i, i + 4);
      if (run.some((m, j) => m.letter !== VOICE_ANSWERS[j])) continue;
      const labels: Record<string, string> = {};
      let ok = true;
      for (let j = 0; j < 4; j++) {
        const m = run[j]!;
        const endAt = run[j + 1]?.index ?? clean.length;
        let label = clean.slice(m.index + m.length, endAt).trim();
        if (j === 3) label = label.split("\n")[0]!.trim();
        if (!label) { ok = false; break; }
        labels[VOICE_ANSWERS[j]!] = label;
      }
      if (ok) return labels;
    }
  }
  return null;
}

/** Timer expiry / Skip button in voice quiz: a separate command, never graded as an answer. */
export const VOICE_SKIP = "skip";

export function validVoiceAnswer(value: unknown): value is string {
  return typeof value === "string" && VOICE_ANSWERS.includes(value);
}