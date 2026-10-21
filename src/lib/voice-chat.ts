/** Typed messages during a voice call: the tutor reads them and answers aloud. */
export const VOICE_CHAT_KEY = "snapsolve.voice.chat";
export const VOICE_CHAT_MAX = 1000;

/** A clean typed message, or null when it is empty, too long or not text. */
export function voiceChatText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // Control characters never reach the tutor; ordinary line breaks stay.
  const text = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!text || text.length > VOICE_CHAT_MAX) return null;
  return text;
}
