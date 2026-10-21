// Shared clean-up for spoken transcripts: removes noise tags, whisper markers and
// the phantom phrases speech models invent from silence or background hiss.

/** Mic settings for clear speech: echo/noise removal, auto volume, mono, voice isolation where supported. */
export const CLEAN_MIC: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  // Chrome/Android support this; other browsers ignore unknown constraints.
  ...({ voiceIsolation: true } as Record<string, boolean>),
};

const TAG = /[[(（【<*♪]\s*(?:whisper\w*|inaudible|noise|background\s*noise|static|silence|music|breath\w*|cough\w*|laugh\w*|sigh\w*|unclear|blank_audio|no\s*speech|applause|foreign|hiss\w*|फुसफुस\w*|शोर)[^\])）】>*♪]*[\])）】>*♪]?/giu;

const PHANTOMS = [
  /thank(?:s| you)(?: so much)? for watching[.!]*/giu,
  /please (?:like and )?subscribe[^.!]*[.!]*/giu,
  /subtitles? (?:by|from)[^.!]*[.!]*/giu,
  /(?:amara\.org|www\.\S+)[^.!]*[.!]*/giu,
  /♪+/gu,
];

/** Clean a transcript fragment; returns "" when it was only noise. */
export function cleanTranscript(text: string): string {
  let out = text.replace(TAG, ' ');
  for (const re of PHANTOMS) out = out.replace(re, ' ');
  out = out.replace(/\s{2,}/g, ' ');
  return /[\p{L}\p{N}]/u.test(out) ? out : '';
}

/** True when a fragment carries no real speech (noise/whisper tag or phantom phrase only). */
export function isNoiseOnly(text: string): boolean {
  return text.trim() !== '' && cleanTranscript(text).trim() === '';
}
