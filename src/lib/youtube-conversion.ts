import type { DubSegment, TimedSegment } from './youtube-hindi';

/** Reuse the complete ordered translation, instead of generating the same lecture twice. */
export function assembleHindiDub(timed: TimedSegment[], lines: string[]) {
  if (lines.length !== timed.length || lines.some(line => !line.trim())) {
    throw new Error('Hindi transcript is incomplete. Please try again.');
  }
  const dub: DubSegment[] = timed.map((segment, index) => ({
    start: segment.start, end: segment.end, hindi: lines[index]?.trim() ?? '',
  }));
  return { dub, hindi: dub.map(segment => segment.hindi).join('\n\n') };
}