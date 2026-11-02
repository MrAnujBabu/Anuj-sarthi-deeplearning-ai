import { describe, expect, it } from 'vitest';
import { voiceSettingsLocked } from '@/lib/voice-session';

describe('voice stays in the same session until End', () => {
  it('locks creation settings during a connected call instead of stopping it to apply changes', () => {
    expect(voiceSettingsLocked('connected')).toBe(true);
  });
  it('prevents settings changes during startup and final usage cleanup', () => {
    expect(voiceSettingsLocked('connecting')).toBe(true);
    expect(voiceSettingsLocked('stopping')).toBe(true);
  });
  it('allows settings again before an explicit new call', () => {
    expect(voiceSettingsLocked('idle')).toBe(false);
    expect(voiceSettingsLocked('closed')).toBe(false);
  });
});