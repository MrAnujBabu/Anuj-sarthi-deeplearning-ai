import { isSarvamVoice, type SarvamVoice } from './sarvam-speech';

/** Original preset identities with persona-specific delivery, not cloned Sarvam identities. */
export const YOUTUBE_VOICE_PROFILES: Record<SarvamVoice, { voiceName: string; gender: 'male' | 'female'; delivery: string }> = {
  shubh_hi_customer: { voiceName: 'Charon', gender: 'male', delivery: 'Warm mid-register male delivery, friendly and reassuring, steady rhythm and gentle emphasis.' },
  ratan_hi_customer_expressive: { voiceName: 'Fenrir', gender: 'male', delivery: 'Full-bodied expressive male delivery, lively confident energy, controlled pitch variation and crisp emphasis; never shout or become theatrical.' },
  aayan_hi_conversational: { voiceName: 'Puck', gender: 'male', delivery: 'Youthful light male delivery, easy conversational rhythm, approachable and lightly upbeat.' },
  kabir_hi_conversational: { voiceName: 'Orus', gender: 'male', delivery: 'Grounded lower-register male delivery, calm confidence, measured phrases and clear consonants.' },
  sumit_hi_conversational: { voiceName: 'Iapetus', gender: 'male', delivery: 'Balanced mid-register male delivery, matter-of-fact and relaxed, smooth connected phrases.' },
  kavya_hi_conversational: { voiceName: 'Aoede', gender: 'female', delivery: 'Bright open female delivery, friendly conversational pitch variation and gently flowing phrases.' },
  ishita_hi_edtech: { voiceName: 'Kore', gender: 'female', delivery: 'Clear mid-register female teacher delivery, patient and warm, composed confidence, gentle emphasis on key concepts and short pauses between ideas.' },
  simran_hi_conversation: { voiceName: 'Leda', gender: 'female', delivery: 'Soft but clearly voiced female delivery, approachable and relaxed, gentle inflection without whispering or breathiness.' },
  aparna_hi_customer: { voiceName: 'Sulafat', gender: 'female', delivery: 'Warm rounded female delivery, reassuring and friendly, even pacing and understated expression.' },
};

export function youtubeVoiceProfile(value: unknown) {
  return isSarvamVoice(value) ? YOUTUBE_VOICE_PROFILES[value] : undefined;
}

export function youtubeDeliveryPrompt(text: string, persona: unknown) {
  const profile = youtubeVoiceProfile(persona);
  if (!profile) return undefined;
  return `Use an original Indian Hindi voice. ${profile.delivery} Speak like a naturally recorded Hindi video, not a translation being read out. Use a North Indian accent, complete word endings, smooth Hindi-English transitions and clear technical terms. Follow the supplied text's questions, emphasis and emotion without changing the words. Keep the same register and even loudness across every segment; begin the supplied sentence directly and finish cleanly, without introductory silence or a long trailing pause. Use a comfortable conversational pace with short natural pauses, not a newsreader cadence or exaggerated teacher performance. No music, added fillers, laughter or breath effects. This is delivery guidance for your own preset voice, not voice imitation. Read only the following text exactly, without adding, translating or reading these instructions:\n${text}`;
}