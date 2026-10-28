// Browser speech fetch for the YouTube→Hindi page: Sarvam first, Lovable AI voice as backup.
import type { SarvamVoice } from './sarvam-speech';
import { YOUTUBE_VOICE_PROFILES } from './youtube-voice-profile';

export const YOUTUBE_SPEECH_MODEL = 'google/gemini-2.5-pro-tts';

/** How long the backup voice is used before Sarvam is tried again (credits may be topped up). */
export const SARVAM_RETRY_MS = 2 * 60 * 1000;

/** Once Sarvam fails, the backup voice is used until `backupUntil`, then Sarvam is retried. */
export const speechState = { useBackup: false, backupUntil: 0 };

/** Each Sarvam voice gets its own closest-matching backup voice (pitch, gender, energy). */
export const BACKUP_VOICE: Record<SarvamVoice, string> = {
  shubh_hi_customer: 'Charon',
  ratan_hi_customer_expressive: 'Fenrir',
  aayan_hi_conversational: 'Puck',
  kabir_hi_conversational: 'Orus',
  sumit_hi_conversational: 'Iapetus',
  kavya_hi_conversational: 'Aoede',
  ishita_hi_edtech: 'Kore',
  simran_hi_conversation: 'Leda',
  aparna_hi_customer: 'Sulafat',
};

/** Sarvam failures that a backup voice can cover: credits, access, busy, outage, network. */
export function shouldUseBackup(status: number | 'network') {
  return status === 'network' || status === 402 || status === 403 || status === 429 || status === 401 || status >= 500;
}

export async function fetchHindiSpeech(text: string, voice: SarvamVoice, signal: AbortSignal, now = Date.now()): Promise<Response> {
  if (speechState.useBackup && now >= speechState.backupUntil) speechState.useBackup = false;
  if (!speechState.useBackup) {
    let status: number | 'network' = 'network';
    try {
      const res = await fetch('/api/sarvam-speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice }), signal });
      if (res.ok && res.body) return res;
      status = res.status;
    } catch (error) { if (signal.aborted) throw error; }
    if (!shouldUseBackup(status)) throw new Error(`Speech failed (${status})`);
    speechState.useBackup = true;
    speechState.backupUntil = now + SARVAM_RETRY_MS;
  }
  const profile = YOUTUBE_VOICE_PROFILES[voice];
  const res = await fetch('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: profile.gender, voiceName: profile.voiceName, youtubePersona: voice }), signal });
  if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(String(j.error || `Speech failed (${res.status})`)); }
  return res;
}
