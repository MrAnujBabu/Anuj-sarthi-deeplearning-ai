import { describe, expect, it } from 'vitest';
import { speechChoice, liveDelivery, INDIAN_BRIGHT_DELIVERY } from '../lib/voice-style';
import { VOICE_CHOICES } from '../lib/quiz-label-preference';

describe('selectable approved voice styles', () => {
  it('offers the original bright female delivery in both speech paths', () => {
    const selected = VOICE_CHOICES.find(c => c.id === 'indian-bright-f');
    expect(selected?.voice).toBe('willow');
    expect(speechChoice(selected?.id)).toEqual({ voice: 'female', style: 'indian-bright' });
    expect(liveDelivery(selected?.voice ?? '', selected?.accent ?? '')).toBe(INDIAN_BRIGHT_DELIVERY);
    expect(liveDelivery('willow', 'neutral')).toBe('');
    expect(liveDelivery('marin', 'indian')).toBe('');
  });
  it('preserves the previous female teacher voice and default', () => {
    expect(VOICE_CHOICES[0].id).toBe('indian-f');
    expect(VOICE_CHOICES[0].voice).toBe('marin');
    expect(speechChoice('indian-f')).toEqual({ voice: 'female', style: 'teacher' });
    expect(speechChoice(undefined)).toEqual({ voice: 'female', style: 'teacher' });
  });
  it('maps the selectable Indian male voice to dubbing without replacing the teacher', () => {
    expect(VOICE_CHOICES.find(c => c.id === 'indian-m')?.voice).toBe('meridian');
    expect(speechChoice('indian-m')).toEqual({ voice: 'male', style: 'indian-dubbing' });
  });
});