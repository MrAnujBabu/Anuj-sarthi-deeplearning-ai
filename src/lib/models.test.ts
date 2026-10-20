import { afterEach, expect, it } from 'vitest';
import { DEFAULT_MODEL, VOICE_TUTOR_MODEL, resolveModel, upgradedTutorPreference } from './models';
afterEach(() => localStorage.clear());
it('chat and voice default to advanced Claude Fable 5.1', () => {
  expect(DEFAULT_MODEL).toBe('anthropic/claude-fable-5-1');
  expect(VOICE_TUTOR_MODEL).toBe('anthropic/claude-fable-5-1');
  expect(resolveModel(undefined)?.id).toBe(DEFAULT_MODEL);
});
it('upgrades the old chat selection once with high reasoning', () => {
  localStorage.setItem('snapsolve.model', 'anthropic/claude-sonnet-5');
  expect(upgradedTutorPreference(localStorage)).toEqual({ model: 'anthropic/claude-fable-5-1', effort: 'high' });
  localStorage.setItem('snapsolve.model', 'anthropic/claude-opus-5-5');
  expect(upgradedTutorPreference(localStorage).model).toBe('anthropic/claude-opus-5-5');
});