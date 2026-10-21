import { describe, expect, it } from 'vitest';
import { VOICE_CHAT_MAX, voiceChatText } from '@/lib/voice-chat';

describe('typed voice-call messages', () => {
  it('allows up to 1000 characters and refuses longer ones', () => {
    expect(VOICE_CHAT_MAX).toBe(1000);
    expect(voiceChatText('a'.repeat(1000))).toHaveLength(1000);
    expect(voiceChatText('a'.repeat(1001))).toBeNull();
  });
  it('refuses empty text and anything that is not text', () => {
    expect(voiceChatText('   \n ')).toBeNull();
    expect(voiceChatText(42)).toBeNull();
    expect(voiceChatText(undefined)).toBeNull();
  });
  it('trims, drops control characters and keeps line breaks', () => {
    expect(voiceChatText('  Krebs\u0007 cycle\r\nkahan hota hai?  ')).toBe('Krebs cycle\nkahan hota hai?');
  });
});
