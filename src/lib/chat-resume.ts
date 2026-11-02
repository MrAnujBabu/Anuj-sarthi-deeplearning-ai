/** Message sent when the student resumes a paused/interrupted answer. Rendered as a small chip, not a bubble. */
export const RESUME_TEXT = "[continue] Continue exactly where you stopped. Do not repeat anything you already wrote — pick up from the last word.";

export const isResumeText = (text: string) => text.trim().startsWith("[continue]");

/** True for dropped connections (offline, fetch failure, stream cut) — these are safe to auto-resume. */
export function isConnectionError(message: string | undefined): boolean {
  if (!message) return false;
  return /failed to fetch|network|load failed|connection|err_internet|terminated|stream (closed|ended)|timed? ?out|econnreset|socket/i.test(message)
    && !/credit|402|403|unauthor|not registered/i.test(message);
}

export const pausedKey = (threadId: string) => `snapsolve.paused.${threadId}`;
