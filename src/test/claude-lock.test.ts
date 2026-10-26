import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { DEFAULT_MODEL, MODELS, VOICE_TUTOR_MODEL } from '@/lib/models';

// Claude/Anthropic settings are frozen by the user. Change only on explicit request.
test('Claude tutor models stay unchanged', () => {
  expect(DEFAULT_MODEL).toBe('anthropic/claude-fable-5-1');
  expect(VOICE_TUTOR_MODEL).toBe('anthropic/claude-fable-5-1');
  expect(MODELS.map((m) => m.id)).toEqual([
    'anthropic/claude-opus-5-5',
    'anthropic/claude-fable-5-1',
    'anthropic/claude-sonnet-5',
    'anthropic/claude-opus-5',
    'anthropic/claude-haiku-4-5',
  ]);
});

test('document reading stays on Claude Haiku 4.5', () => {
  const src = readFileSync('src/lib/memory.functions.ts', 'utf8');
  expect(src).toContain('model: "anthropic/claude-haiku-4-5"');
});
