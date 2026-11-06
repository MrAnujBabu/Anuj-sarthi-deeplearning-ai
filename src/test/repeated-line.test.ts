import { describe, expect, it } from 'vitest';
import { isRepeatedLine, speakableText } from '@/lib/repeated-line';
import { SPEAK_ONCE_RULE } from '@/lib/youtube-voice-profile';
import { indianTeacherPrompt } from '@/routes/api/speech';

describe('repeated voice lines', () => {
  it('treats the same line again as a repeat', () => {
    expect(isRepeatedLine('पहला सवाल: ठंड कैसे लें?', 'पहला सवाल:  ठंड कैसे लें')).toBe(true);
  });
  it('does not skip a different line', () => {
    expect(isRepeatedLine('दूसरा सवाल', 'पहला सवाल')).toBe(false);
  });
  it('does not skip the first line', () => {
    expect(isRepeatedLine('पहला सवाल', undefined)).toBe(false);
  });
  it('speaks a doubled last sentence only once', () => {
    expect(speakableText('संदेश जाता है। संदेश तेज़ी से पहुँचता है। संदेश तेज़ी से पहुँचता है।'))
      .toBe('संदेश जाता है। संदेश तेज़ी से पहुँचता है।');
  });
  it('drops a first sentence that repeats the previous part\'s last sentence', () => {
    expect(speakableText('संदेश तेज़ी से पहुँचता है। फिर चर्बी जलती है।', 'पानी ठंडा है। संदेश तेज़ी से पहुँचता है।'))
      .toBe('फिर चर्बी जलती है।');
  });
  it('tells the backup voice to read the text once', () => {
    expect(indianTeacherPrompt('नमस्ते।', true)).toContain(SPEAK_ONCE_RULE);
    expect(indianTeacherPrompt('नमस्ते।')).toContain(SPEAK_ONCE_RULE);
  });
});
