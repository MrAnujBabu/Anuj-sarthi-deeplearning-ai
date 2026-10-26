import { expect, it } from 'vitest';
import { sarvamSpeechRequest, sarvamAudioEvents, SARVAM_VOICES, isSarvamVoice, resolveSarvamVoice, sarvamFallback, isSpeakableSarvamText, sarvamSkippedEvents } from '@/lib/sarvam-speech';
import { SPEECH_VOICES } from '@/lib/speech-voice';

it('preserves every existing Gemini speech voice', () => {
  expect([...SPEECH_VOICES]).toEqual(['Kore', 'Aoede', 'Leda']);
});
it('requests the additional Sarvam voice as mono-compatible 24 kHz PCM', () => {
  expect(sarvamSpeechRequest('नमस्ते')).toEqual({ text: 'नमस्ते', language_code: 'hi-IN',
    model: 'bulbul:v4-flash', speaker: 'shubh_hi_customer', speech_sample_rate: 24000, output_audio_codec: 'linear16', pace: 1.35 });
});
it('adapts all audio segments to the existing speech event contract', () => {
  const events = sarvamAudioEvents(['AAAA', 'AQAB']);
  expect(events.split('\n\n').filter(Boolean).map(event => JSON.parse(event.slice(6)))).toEqual([
    { type: 'speech.audio.delta', audio: 'AAAA' }, { type: 'speech.audio.delta', audio: 'AQAB' }, { type: 'speech.audio.done' },
  ]);
});
it('keeps only curated Hindi conversational and teacher v4 personas without duplicates', () => {
  expect([...SARVAM_VOICES]).toEqual([
    'shubh_hi_customer', 'ratan_hi_customer_expressive', 'aayan_hi_conversational',
    'kabir_hi_conversational', 'sumit_hi_conversational', 'kavya_hi_conversational',
    'ishita_hi_edtech', 'simran_hi_conversation', 'aparna_hi_customer',
  ]);
  expect(new Set(SARVAM_VOICES).size).toBe(9);
});
it.each([
  ['shubh', 'shubh_hi_customer'], ['ratan', 'ratan_hi_customer_expressive'],
  ['aayan', 'aayan_hi_conversational'], ['kabir', 'kabir_hi_conversational'],
  ['sumit', 'sumit_hi_conversational'], ['kavya', 'kavya_hi_conversational'],
  ['ishita', 'ishita_hi_edtech'], ['simran', 'simran_hi_conversation'],
])('migrates saved %s to its corresponding persona', (legacy, persona) => {
  expect(resolveSarvamVoice(legacy)).toBe(persona);
  expect(isSarvamVoice(legacy)).toBe(false);
});
it('preserves current preferences and safely defaults removed or invalid voices', () => {
  expect(resolveSarvamVoice('aparna_hi_customer')).toBe('aparna_hi_customer');
  for (const value of ['shruti', 'unknown', 'constructor', null]) expect(resolveSarvamVoice(value)).toBe('shubh_hi_customer');
});
it.each(SARVAM_VOICES)('forwards the chosen %s speaker to Sarvam', voice => {
  expect(isSarvamVoice(voice)).toBe(true);
  expect(sarvamSpeechRequest('नमस्ते', voice).speaker).toBe(voice);
});
it.each(['Shubh', 'Kore', 'unknown', '', null])('rejects unsupported speaker %s', voice => {
  expect(isSarvamVoice(voice)).toBe(false);
});
it('Sarvam credit khatam hone par Gemini voice par fallback deta hai, Gemini failure par nahi', () => {
  expect(sarvamFallback('shubh_hi_customer', 'Kore')).toBe('Kore');
  expect(sarvamFallback('ishita_hi_edtech', 'Aoede')).toBe('Aoede');
  expect(sarvamFallback('Kore', 'Aoede')).toBeNull();
  expect(sarvamFallback('shubh_hi_customer', null)).toBeNull();
});
it('streams Sarvam PCM as whole-sample audio events before the reply finishes', async () => {
  const { sarvamStreamEvents } = await import('@/lib/sarvam-speech');
  const pcm = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array([1, 2, 3])); c.enqueue(new Uint8Array([4, 5])); c.enqueue(new Uint8Array([6])); c.close(); } });
  const text = await new Response(sarvamStreamEvents(pcm, 4)).text();
  const events = text.split('\n\n').filter(Boolean).map(e => JSON.parse(e.slice(6)));
  expect(events.map(e => e.type)).toEqual(['speech.audio.delta', 'speech.audio.delta', 'speech.audio.done']);
  expect(atob(events[0].audio).length).toBe(4);
  expect(atob(events[1].audio).length).toBe(2);
});
it('reports an error instead of silence when Sarvam streams no audio', async () => {
  const { sarvamStreamEvents } = await import('@/lib/sarvam-speech');
  const text = await new Response(sarvamStreamEvents(new ReadableStream({ start(c) { c.close(); } }))).text();
  expect(JSON.parse(text.slice(6, text.indexOf('\n\n'))).type).toBe('error');
});
it('tells the queue to move on when a chunk has nothing to read', () => {
  expect(sarvamSkippedEvents().split('\n\n').filter(Boolean).map(e => JSON.parse(e.slice(6)))).toEqual([{ type: 'speech.audio.skipped' }]);
});
it.each(['❌', '✅', '—', '...', '', '###', '•'])('keeps Sarvam for the unreadable fragment %j', text => {
  expect(isSpeakableSarvamText(text)).toBe(false);
});
it.each(['Mitochondria is the powerhouse of the cell.', 'माइटोकॉन्ड्रिया सेल का powerhouse है', '4', 'ATP', 'B'])(
  'asks Sarvam to read %j', text => { expect(isSpeakableSarvamText(text)).toBe(true); });
