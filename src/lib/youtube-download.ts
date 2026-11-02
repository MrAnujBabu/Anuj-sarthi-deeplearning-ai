import { encodeWav } from './record-wav';
import { SPEECH_SAMPLE_RATE } from './stream-speech';
import { downloadBlob } from './transcript-export';

/** Join PCM payloads in transcript order, with one valid WAV header. */
export async function narrationWav(parts: readonly Blob[]): Promise<Blob> {
  const size = parts.reduce((sum, part) => sum + part.size, 0);
  if (!size || size % 2 || size > 0xffffffff - 36) throw new Error('Invalid narration audio.');
  const header = await encodeWav([], SPEECH_SAMPLE_RATE).arrayBuffer();
  const view = new DataView(header);
  view.setUint32(4, 36 + size, true);
  view.setUint32(40, size, true);
  return new Blob([header, ...parts], { type: 'audio/wav' });
}

export async function deliverNarration(blob: Blob, name: string) {
  const file = new File([blob], name, { type: 'audio/wav' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
  }
  downloadBlob(name, blob);
}