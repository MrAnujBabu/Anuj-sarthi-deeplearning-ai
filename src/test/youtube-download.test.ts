import { expect, it } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { narrationWav } from '@/lib/youtube-download';

it('exports complete 24 kHz mono Hindi narration in the original transcript order', async () => {
  const { vi } = await import('vitest');
  vi.stubGlobal('Blob', NodeBlob);
  const first = new Uint8Array([1, 0, 2, 0]), second = new Uint8Array([3, 0]);
  const wav = await narrationWav([new Blob([first]), new Blob([second])]);
  const bytes = await wav.arrayBuffer(), header = new DataView(bytes);
  expect(wav.type).toBe('audio/wav');
  expect(header.getUint32(24, true)).toBe(24000);
  expect(header.getUint16(22, true)).toBe(1);
  expect(header.getUint32(40, true)).toBe(6);
  expect([...new Uint8Array(bytes, 44)]).toEqual([1, 0, 2, 0, 3, 0]);
  vi.unstubAllGlobals();
});