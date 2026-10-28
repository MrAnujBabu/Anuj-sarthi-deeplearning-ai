import { describe, expect, it, vi, beforeEach } from 'vitest';
import { shouldUseBackup, fetchHindiSpeech, speechState, BACKUP_VOICE, SARVAM_RETRY_MS } from './youtube-speech';
import { SARVAM_VOICES } from './sarvam-speech';

const ok = () => new Response('data: {}\n\n', { status: 200 });

describe('YouTube Hindi backup voice', () => {
  beforeEach(() => { speechState.useBackup = false; speechState.backupUntil = 0; });
  it('switches to the Lovable voice when Sarvam credits run out', () => expect(shouldUseBackup(402)).toBe(true));
  it('switches on Sarvam outage or network loss', () => {
    expect(shouldUseBackup(503)).toBe(true);
    expect(shouldUseBackup('network')).toBe(true);
  });
  it('does not hide a bad request behind the backup', () => expect(shouldUseBackup(400)).toBe(false));
  it('gives every Sarvam voice its own distinct backup voice', () => {
    const names = SARVAM_VOICES.map(v => BACKUP_VOICE[v]);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(SARVAM_VOICES.length);
  });
  it('tries Sarvam again 2 minutes after switching to backup', async () => {
    const f = vi.fn().mockResolvedValueOnce(Response.json({}, { status: 402 })).mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    const s = new AbortController().signal;
    await fetchHindiSpeech('a', 'ishita_hi_edtech', s, 0);
    await fetchHindiSpeech('b', 'ishita_hi_edtech', s, SARVAM_RETRY_MS - 1);
    await fetchHindiSpeech('c', 'ishita_hi_edtech', s, SARVAM_RETRY_MS);
    expect(f.mock.calls.map(c => c[0])).toEqual(['/api/sarvam-speech', '/api/speech', '/api/speech', '/api/sarvam-speech']);
    expect(JSON.parse(f.mock.calls[1]![1].body).voiceName).toBe('Kore');
  });
});
