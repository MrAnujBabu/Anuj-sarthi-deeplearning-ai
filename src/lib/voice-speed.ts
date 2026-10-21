/**
 * Voice speaking speed. A live WebRTC stream always plays at 1× in the
 * browser (media elements ignore playbackRate for live streams), so speed is
 * the tutor's own speaking pace: sent in the call instructions at start and
 * as a mid-call instruction update when the student changes it.
 */
export const VOICE_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type VoiceSpeed = (typeof VOICE_SPEEDS)[number];
export const VOICE_SPEED_KEY = "snapsolve.voice.speed";

/** Keep any rate inside a clear-speech range (0.5–3, invalid → 1). */
export function clampPlaybackRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1;
  return Math.min(3, Math.max(0.5, rate));
}

/** Only the offered speeds are accepted from a browser; anything else is rejected. */
export function voiceSpeed(raw: unknown): VoiceSpeed | null {
  return typeof raw === "number" && (VOICE_SPEEDS as readonly number[]).includes(raw) ? (raw as VoiceSpeed) : null;
}

const PACE: Record<VoiceSpeed, string> = {
  0.75: "speak slowly and very clearly, with a short pause between points",
  1: "speak at a normal, steady teacher pace",
  1.25: "speak a little faster than normal (about 1.25x) for quick revision",
  1.5: "speak noticeably faster than normal (about 1.5x) for fast revision",
  1.75: "speak fast (about 1.75x) for rapid revision",
  2: "speak as fast as you can (about 2x) for rapid revision",
};

/** Pace line for the session instructions at call start. */
export function paceInstruction(speed: VoiceSpeed): string {
  return `Speaking pace: ${PACE[speed]}; keep every word clear and never skip content to save time.`;
}

/** Mid-call update sent as one instructions append (well under the 480-byte append limit). */
export function paceUpdate(speed: VoiceSpeed): string {
  return `The student changed the speaking speed to ${speed}x. From now on, ${PACE[speed]}; keep every word clear and never skip content.`;
}
