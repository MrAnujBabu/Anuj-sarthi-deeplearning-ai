// Browser-safe word-level highlight helpers for the Hindi voice-over caption.

/** Splits spoken text into highlightable words (whitespace-separated, Hindi included). */
export function spokenWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * How many words of `text` have been spoken after `fraction` (0–1) of the audio elapsed.
 * Clamped so a mid-segment seek or an overrun never highlights beyond the text.
 */
export function spokenWordCount(text: string, fraction: number): number {
  const words = spokenWords(text);
  if (!words.length) return 0;
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  return Math.min(words.length, Math.floor(f * words.length));
}
