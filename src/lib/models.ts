export const MODELS = [
  { id: 'anthropic/claude-opus-5-5', name: 'Opus 5.5', description: 'Premium reasoning', effort: true },
  { id: 'anthropic/claude-fable-5-1', name: 'Fable 5.1', description: 'Deep study tasks', effort: true },
  { id: 'anthropic/claude-sonnet-5', name: 'Sonnet 5', description: 'Balanced teacher', effort: true },
  { id: 'anthropic/claude-opus-5', name: 'Opus 5', description: 'Advanced analysis', effort: true },
  { id: 'anthropic/claude-haiku-4-5', name: 'Haiku 4.5', description: 'Quick questions', effort: false },
] as const;
export const DEFAULT_MODEL = 'anthropic/claude-opus-5-5';
export const VOICE_TUTOR_MODEL = 'anthropic/claude-opus-5-5';
export const CLAUDE_OUTPUT_BUDGET = 64000; // Messages requires a budget, including adaptive thinking.
/** Apply the owner's advanced-tutor upgrade once; later explicit selections remain intact. */
export function upgradedTutorPreference(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  if (storage.getItem('snapsolve.premium-tutor-v2') !== '1') {
    storage.setItem('snapsolve.model', DEFAULT_MODEL);
    storage.setItem('snapsolve.effort', 'high');
    storage.setItem('snapsolve.premium-tutor-v2', '1');
  }
  return { model: resolveModel(storage.getItem('snapsolve.model'))?.id ?? DEFAULT_MODEL, effort: resolveEffort(storage.getItem('snapsolve.effort')) };
}
export type Effort = 'low' | 'medium' | 'high';
export function resolveModel(id: unknown) {
  if (id === undefined) return MODELS.find(m => m.id === DEFAULT_MODEL);
  return MODELS.find(m => m.id === id);
}
export function resolveEffort(value: unknown): Effort {
  return value === 'low' || value === 'high' ? value : 'medium';
}