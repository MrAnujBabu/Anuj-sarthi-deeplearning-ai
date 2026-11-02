/** Shared delivery controls; never attempt to imitate a named performer. */
export const INDIAN_DUBBING_DELIVERY = "Use an original full-bodied Indian male dubbing delivery: resonant, confident and warm, with crisp Hindi-Hinglish pronunciation, natural pauses and controlled emphasis. Keep explanations conversational and easy to follow, not theatrical shouting. Do not imitate any real actor or named person's voice.";

export const INDIAN_BRIGHT_DELIVERY = "Use an original bright Indian female delivery: warm, lively and conversational, with clear, forward Hindi-Hinglish diction. Use gently rising questions, small pitch variations and light emphasis on important words, followed by a relaxed sentence ending. Bring friendly radio-presenter energy without a formal announcer cadence or theatrical performance. Keep the tone open and natural, never muffled, nasal, metallic, whispery or artificially breathy; articulate consonants and finish every word without over-enunciating. Maintain even loudness, smooth Hindi-English transitions, a comfortable teaching pace and short natural pauses between ideas; slow down for scientific terms. Do not reproduce scene music, background voices or recording effects. Stay friendly and confident, never shout or exaggerate emotion or laughter. Do not imitate any real actor, character performer or named person's voice.";

export function liveDelivery(voice: string, accent: string) {
  if (accent !== 'indian') return '';
  if (voice === 'willow') return INDIAN_BRIGHT_DELIVERY;
  if (voice === 'meridian') return INDIAN_DUBBING_DELIVERY;
  return '';
}

export function speechChoice(choice: unknown) {
  if (choice === 'indian-bright-f') return { voice: 'female', style: 'indian-bright' } as const;
  if (choice === 'indian-m') return { voice: 'male', style: 'indian-dubbing' } as const;
  if (choice === 'us-m' || choice === 'uk-m') return { voice: 'male', style: 'teacher' } as const;
  return { voice: 'female', style: 'teacher' } as const;
}