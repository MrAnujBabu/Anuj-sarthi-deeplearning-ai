// Browser-only: pulls speech out of a local or web video/audio file as 16 kHz mono WAV pieces.
// Media is decoded on the device (Mediabunny + WebCodecs), so large videos never upload whole;
// only small speech pieces go to the listener. Import lazily — never from SSR code paths.
import { AUDIO_CHUNK_SECONDS, MAX_MEDIA_SECONDS } from './youtube-hindi';

export const LISTEN_RATE = 16000;
export type AudioPiece = { index: number; offset: number; duration: number; wav: Blob };

/** Writes 16-bit PCM samples into a complete WAV file. */
export function pcm16Wav(samples: Int16Array, sampleRate = LISTEN_RATE): Blob {
  const header = new ArrayBuffer(44); const v = new DataView(header);
  const tag = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  tag(0, 'RIFF'); v.setUint32(4, 36 + samples.byteLength, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); tag(36, 'data'); v.setUint32(40, samples.byteLength, true);
  return new Blob([header, samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength) as ArrayBuffer], { type: 'audio/wav' });
}

/** Streaming box-filter resampler to 16 kHz: averages input inside each output step (light anti-aliasing for speech). */
export class SpeechResampler {
  private acc = 0; private n = 0; private pos = 0; private last = 0;
  constructor(private readonly outRate = LISTEN_RATE) {}
  push(input: Float32Array, inRate: number, emit: (value: number) => void) {
    const step = inRate / this.outRate;
    for (let i = 0; i < input.length; i++) {
      this.acc += input[i] ?? 0; this.n++; this.pos += 1;
      while (this.pos >= step) {
        const value = this.n ? this.acc / this.n : this.last;
        emit(value); this.last = value; this.acc = 0; this.n = 0; this.pos -= step;
      }
    }
  }
}

/** Collects 16 kHz samples into fixed-length WAV pieces aligned to the media timeline. */
export class PieceWriter {
  private buffer: Int16Array; private filled = 0; private index = 0; private written = 0;
  constructor(private readonly pieceSeconds: number, private readonly onPiece: (piece: AudioPiece) => void, private readonly rate = LISTEN_RATE) {
    this.buffer = new Int16Array(pieceSeconds * rate);
  }
  get seconds() { return this.written / this.rate; }
  write(value: number) {
    const s = Math.max(-1, Math.min(1, value));
    this.buffer[this.filled++] = s < 0 ? s * 32768 : s * 32767;
    this.written++;
    if (this.filled === this.buffer.length) this.flush();
  }
  /** Inserts silence so a gap in the media keeps later speech at the right timestamp. */
  padTo(frame: number) { while (this.written < frame) this.write(0); }
  flush() {
    if (!this.filled) return;
    const samples = this.buffer.slice(0, this.filled);
    const offset = this.index * this.pieceSeconds;
    this.onPiece({ index: this.index, offset, duration: this.filled / this.rate, wav: pcm16Wav(samples, this.rate) });
    this.index++; this.filled = 0;
  }
}

function proxied(url: string) { return `/api/media-proxy?url=${encodeURIComponent(url)}`; }

/** Same-origin when the media site allows cross-origin reads, else through the app's media reader. */
async function readableUrl(url: string) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-1' }, mode: 'cors' });
    await res.body?.cancel().catch(() => {});
    if (res.ok || res.status === 206) return url;
  } catch { /* blocked by CORS */ }
  return proxied(url);
}

export type ExtractOptions = {
  file?: Blob; url?: string; signal: AbortSignal;
  pieceSeconds?: number; maxSeconds?: number;
  onPiece(piece: AudioPiece): void;
  onProgress?(seconds: number, total: number): void;
};

export class MediaAudioError extends Error {}

/** Decodes the primary audio track and emits WAV pieces as soon as each is complete. */
export async function extractSpeechPieces(o: ExtractOptions): Promise<{ duration: number; heard: number; truncated: boolean }> {
  const mb = await import('mediabunny');
  const pieceSeconds = o.pieceSeconds ?? AUDIO_CHUNK_SECONDS, maxSeconds = o.maxSeconds ?? MAX_MEDIA_SECONDS;
  let source: InstanceType<typeof mb.BlobSource> | InstanceType<typeof mb.UrlSource>;
  if (o.file) source = new mb.BlobSource(o.file);
  else if (o.url) { const url = await readableUrl(o.url); source = new mb.UrlSource(url, { maxCacheSize: 32 * 1024 * 1024 }); }
  else throw new MediaAudioError('कोई video नहीं दी गई।');
  const input = new mb.Input({ formats: mb.ALL_FORMATS, source });
  const abort = () => { input.dispose(); };
  o.signal.addEventListener('abort', abort, { once: true });
  try {
    const track = await input.getPrimaryAudioTrack().catch(() => { throw new MediaAudioError('यह file पढ़ी नहीं जा सकी। MP4, WebM, MOV, MP3 या M4A आज़माएँ।'); });
    if (!track) throw new MediaAudioError('इस video में आवाज़ (audio track) नहीं मिली।');
    if (!(await track.canDecode())) {
      if (o.file) return await decodeWithWebAudio(o.file, pieceSeconds, maxSeconds, o);
      throw new MediaAudioError('यह browser इस video की आवाज़ नहीं खोल सकता। Chrome या Edge में खोलें, या file download करके upload करें।');
    }
    const total = await input.computeDuration().catch(() => 0);
    const end = Math.min(total || maxSeconds, maxSeconds);
    const resampler = new SpeechResampler();
    const writer = new PieceWriter(pieceSeconds, o.onPiece);
    const sink = new mb.AudioSampleSink(track);
    let lastReport = 0;
    for await (const sample of sink.samples(0, end)) {
      if (o.signal.aborted) { sample.close(); break; }
      try {
        writer.padTo(Math.round(sample.timestamp * LISTEN_RATE) - LISTEN_RATE / 50);
        const channels = sample.numberOfChannels, frames = sample.numberOfFrames;
        const mono = new Float32Array(frames);
        const plane = new Float32Array(frames);
        for (let c = 0; c < channels; c++) {
          sample.copyTo(plane, { planeIndex: c, format: 'f32-planar' });
          for (let i = 0; i < frames; i++) mono[i] = (mono[i] ?? 0) + (plane[i] ?? 0) / channels;
        }
        resampler.push(mono, sample.sampleRate, v => writer.write(v));
      } finally { sample.close(); }
      if (writer.seconds - lastReport >= 5) { lastReport = writer.seconds; o.onProgress?.(writer.seconds, end); }
      if (writer.seconds >= end) break;
    }
    o.signal.throwIfAborted();
    writer.flush();
    o.onProgress?.(writer.seconds, end);
    return { duration: total, heard: writer.seconds, truncated: total > maxSeconds + 1 };
  } finally {
    o.signal.removeEventListener('abort', abort);
    input.dispose();
  }
}

/** Fallback for browsers without WebCodecs audio decoding: whole-file Web Audio decode (size-capped). */
async function decodeWithWebAudio(file: Blob, pieceSeconds: number, maxSeconds: number, o: ExtractOptions) {
  if (file.size > 250 * 1024 * 1024) throw new MediaAudioError('यह browser इतनी बड़ी file की आवाज़ नहीं खोल सकता। Chrome में खोलें या छोटी file चुनें।');
  const context = new OfflineAudioContext(1, 1, LISTEN_RATE);
  let buffer: AudioBuffer;
  try { buffer = await context.decodeAudioData(await file.arrayBuffer()); }
  catch { throw new MediaAudioError('इस file की आवाज़ खोली नहीं जा सकी।'); }
  o.signal.throwIfAborted();
  const frames = Math.min(buffer.length, Math.round(maxSeconds * buffer.sampleRate));
  const mono = new Float32Array(frames);
  for (let c = 0; c < buffer.numberOfChannels; c++) { const data = buffer.getChannelData(c); for (let i = 0; i < frames; i++) mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / buffer.numberOfChannels; }
  const writer = new PieceWriter(pieceSeconds, o.onPiece);
  new SpeechResampler().push(mono, buffer.sampleRate, v => writer.write(v));
  writer.flush();
  o.onProgress?.(writer.seconds, frames / buffer.sampleRate);
  return { duration: buffer.duration, heard: writer.seconds, truncated: buffer.duration > maxSeconds + 1 };
}
