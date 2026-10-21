import { CLEAN_MIC } from "@/lib/noise-filter";
// Records microphone audio as a complete mono WAV file (decodable by every transcription model).
export function encodeWav(chunks: readonly Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const tag = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, length * 2, true);
  let offset = 44;
  for (const chunk of chunks)
    for (const value of chunk) {
      const sample = Math.max(-1, Math.min(1, value));
      view.setInt16(offset, sample * (sample < 0 ? 32768 : 32767), true);
      offset += 2;
    }
  return new Blob([bytes], { type: "audio/wav" });
}

export type Recording = { stop: () => Promise<File>; cancel: () => void; level: () => number };

export async function recordWav(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: CLEAN_MIC });
  let context: AudioContext | undefined;
  try {
    // 16 kHz keeps files small (~32 KB/s) while staying ideal for speech.
    context = new AudioContext({ sampleRate: 16000 });
    await context.resume();
    const ctx = context;
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    let lastLevel = 0;
    node.onaudioprocess = (event) => {
      const data = new Float32Array(event.inputBuffer.getChannelData(0));
      chunks.push(data);
      let sum = 0;
      for (const v of data) sum += v * v;
      lastLevel = Math.sqrt(sum / data.length);
    };
    source.connect(node);
    node.connect(ctx.destination);
    let stopped = false;
    const release = () => {
      stopped = true;
      stream.getTracks().forEach((track) => track.stop());
      node.disconnect();
      source.disconnect();
      node.onaudioprocess = null;
    };
    return {
      level: () => lastLevel,
      cancel() {
        if (stopped) return;
        release();
        void ctx.close();
      },
      async stop() {
        if (stopped) throw new Error("Recording already stopped");
        release();
        const blob = encodeWav(chunks, ctx.sampleRate);
        await ctx.close();
        if (blob.size < 4096) throw new Error("Kuch sunai nahi diya — dobara bolo.");
        return new File([blob], "dictation.wav", { type: "audio/wav" });
      },
    };
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    await context?.close();
    throw error;
  }
}
