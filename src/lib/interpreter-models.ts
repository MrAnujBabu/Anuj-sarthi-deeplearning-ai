// Browser-safe catalog for the expert interpreter panel (YouTube / web / uploaded videos → simple Hindi).
// Model slugs come from the authenticated Lovable AI catalog; the server validates every id it receives.

export const INTERPRETERS = [
  { id: 'claude', model: 'anthropic/claude-opus-5-5', name: 'Claude Opus 5.5', vendor: 'Anthropic', note: 'सबसे natural, बोलचाल वाली Hindi' },
  { id: 'gpt', model: 'openai/gpt-6-astra', name: 'GPT-6 Astra', vendor: 'OpenAI', note: 'शब्दों और तथ्यों में सबसे सटीक' },
  { id: 'gemini', model: 'google/gemini-4-argon', name: 'Gemini 4 Argon', vendor: 'Google', note: 'लंबे और मुश्किल lecture में मज़बूत' },
] as const;

export type InterpreterId = (typeof INTERPRETERS)[number]['id'];
export type InterpreterInfo = (typeof INTERPRETERS)[number];
export const DEFAULT_INTERPRETER: InterpreterId = 'claude';

/** Gemini 4 Argon natively hears audio and watches video; it is the panel's listener. */
export const LISTENER = { model: 'google/gemini-4-argon', name: 'Gemini 4 Argon' } as const;
/** GPT-6 Astra prepares the interpreter's brief: language, topic, terminology and caption fixes. */
export const TERMINOLOGIST = { model: 'openai/gpt-6-astra', name: 'GPT-6 Astra' } as const;

export function isInterpreterId(value: unknown): value is InterpreterId {
  return INTERPRETERS.some(item => item.id === value);
}

export function interpreterInfo(id: InterpreterId): InterpreterInfo {
  return INTERPRETERS.find(item => item.id === id) ?? INTERPRETERS[0];
}

/** The chosen interpreter first, then the other premium vendors as automatic backups. */
export function interpreterOrder(id: InterpreterId): InterpreterId[] {
  return [id, ...INTERPRETERS.map(item => item.id).filter(other => other !== id)];
}

export function interpreterName(model: string) {
  return INTERPRETERS.find(item => item.model === model)?.name ?? model;
}

/** Natural spoken Hindi runs about 2.4 words per second; every timed line must fit its window. */
export const HINDI_WORDS_PER_SECOND = 2.4;
export function wordBudget(seconds: number) {
  return Math.max(6, Math.floor(Math.max(0, seconds) * HINDI_WORDS_PER_SECOND));
}
