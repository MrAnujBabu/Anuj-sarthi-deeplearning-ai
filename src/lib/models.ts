export const MODELS = [
  { id: 'anthropic/claude-sonnet-5', name: 'Sonnet 5', description: 'Balanced teacher', effort: true },
  { id: 'anthropic/claude-opus-5-5', name: 'Opus 5.5', description: 'Complex reasoning', effort: true },
  { id: 'anthropic/claude-fable-5-1', name: 'Fable 5.1', description: 'Deep study tasks', effort: true },
  { id: 'anthropic/claude-opus-5', name: 'Opus 5', description: 'Advanced analysis', effort: true },
  { id: 'anthropic/claude-haiku-4-5', name: 'Haiku 4.5', description: 'Quick questions', effort: false },
] as const;
export const DEFAULT_MODEL = MODELS[0].id;
export const VOICE_TUTOR_MODEL = 'anthropic/claude-fable-5-1';
export type Effort = 'low' | 'medium' | 'high';
export function resolveModel(id: unknown) {
  if (id === undefined) return MODELS[0];
  return MODELS.find(m => m.id === id);
}
export function resolveEffort(value: unknown): Effort {
  return value === 'low' || value === 'high' ? value : 'medium';
}