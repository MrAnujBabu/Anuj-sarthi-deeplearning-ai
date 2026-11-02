// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readTranscript } from '@/lib/transcription';
import { encodeWav } from '@/lib/record-wav';

function response(frames: string[]) {
  return new Response(new ReadableStream({ start(controller) {
    for (const frame of frames) controller.enqueue(new TextEncoder().encode(frame));
    controller.close();
  } }));
}
describe('dictation stream', () => {
  it('handles fragmented frames and delivers partial text before completion', async () => {
    const values: string[] = [];
    const text = await readTranscript(response(['event: transcript\n', 'data: {"type":"transcript.text.delta","delta":"Newton "}\n', '\n', 'data: {"type":"transcript.text.delta","delta":"law"}\n\n', 'data: {"type":"transcript.text.done","text":"Newton law."}\n\n']), value => values.push(value));
    expect(values).toEqual(['Newton ', 'Newton law', 'Newton law.']);
    expect(text).toBe('Newton law.');
  });
  it('preserves credit errors rather than presenting an empty answer', async () => {
    await expect(readTranscript(Response.json({ error: '[AI_CREDITS] Add credits.' }, { status: 402 }), () => {})).rejects.toThrow('[AI_CREDITS] Add credits.');
  });
  it('rejects incomplete streams while preserving received words', async () => {
    const values: string[] = [];
    await expect(readTranscript(response(['data: {"type":"transcript.text.delta","delta":"partial"}\n\n']), v => values.push(v))).rejects.toThrow('interrupted');
    expect(values).toEqual(['partial']);
  });
  it('ends on a stream refusal/error without accepting later completion', async () => {
    await expect(readTranscript(response(['data: {"type":"error","error":{"message":"Access denied"}}\n\n']), () => {})).rejects.toThrow('Access denied');
  });
  it('encodes complete 16 kHz mono WAV and clamps samples', async () => {
    const wav = encodeWav([new Float32Array([-2, 0, 2])], 16000);
    const data = new DataView(await wav.arrayBuffer());
    expect(wav.size).toBe(50);
    expect(data.getUint32(24, true)).toBe(16000);
    expect(data.getUint16(22, true)).toBe(1);
    expect(data.getInt16(44, true)).toBe(-32768);
    expect(data.getInt16(48, true)).toBe(32767);
  });
});