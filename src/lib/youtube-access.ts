/** A server-side bot check is not evidence that a public video is private. */
export function isYouTubeRestricted(player: { reason: string }): boolean {
  return /private video|confirm your age|age[- ]restrict|video (?:has been |was )?(?:removed|deleted)|video unavailable|not available in your country/i.test(player.reason);
}

export function canTryYouTubeListening(player: { status: string; reason: string; title: string }): boolean {
  if (isYouTubeRestricted(player)) return false;
  if (player.status === 'OK' || player.status === 'LIVE_STREAM_OFFLINE' || player.title) return true;
  return /confirm\s+(?:that\s+)?you[’']?re\s+not\s+a\s+bot|unusual traffic|automated (?:queries|requests)/i.test(player.reason);
}