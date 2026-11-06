import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ENHANCE_MAX_SECONDS, animationCost, clipFrames, containerFromName, enabledStudioTools, parseStudioJob,
  probeIsoVideo, studioTopicFrom,
} from '@/lib/studio-tools';

describe('AI Studio on/off switches', () => {
  it('shows only the tools that are switched on', () => {
    expect(enabledStudioTools({ diagram: true, animation: false, enhance: true })).toEqual(['diagram', 'enhance']);
  });

  it('hides AI Studio entirely when every tool is off', () => {
    expect(enabledStudioTools({ diagram: false, animation: false, enhance: false })).toEqual([]);
  });
});

describe('ByteDance animation cost', () => {
  it('prices a 5 second 480p clip at about 2.06 credits', () => {
    expect(animationCost(5, '480p')).toBe(2.06);
  });

  it('prices a 10 second 720p clip at about 9.25 credits', () => {
    expect(animationCost(10, '720p')).toBe(9.25);
  });
});

describe('Topaz clip window', () => {
  const probe = { frameCount: 900, frameRate: 30 };

  it(`never sends more than ${ENHANCE_MAX_SECONDS} seconds`, () => {
    expect(clipFrames(probe, 2, 60)).toMatchObject({ start_index: 60, end_index: 659, frames: 600 });
  });

  it('stops at the last frame of the video', () => {
    expect(clipFrames(probe, 28, 10)).toMatchObject({ start_index: 840, end_index: 899, frames: 60 });
  });

  it('accepts only MP4, MOV and M4V files', () => {
    expect(containerFromName('class.MP4')).toBe('mp4');
    expect(containerFromName('board.mov')).toBe('mov');
    expect(containerFromName('lecture.webm')).toBeNull();
  });
});

describe('video reader', () => {
  it('reads size, frame count and frame rate from an MP4', () => {
    const file = readFileSync(resolve(__dirname, 'fixtures/tiny-320x240-25fps.mp4'));
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    expect(probeIsoVideo(buffer, 'mp4')).toMatchObject({ width: 320, height: 240, frameCount: 50, frameRate: 25 });
  });

  it('returns null for a file that is not a video', () => {
    expect(probeIsoVideo(new TextEncoder().encode('not a video at all').buffer, 'mp4')).toBeNull();
  });
});

describe('video job status', () => {
  it('turns gateway seconds and milli-credits into ms and credits', () => {
    expect(parseStudioJob({ id: 'vid_1', status: 'completed', progress: 100, expires_at: 1_800_000_000, lovable_billed_milli_credits: 2056, created_at: 1, object: 'video' }))
      .toEqual({ id: 'vid_1', status: 'completed', progress: 100, expiresAt: 1_800_000_000_000, billedCredits: 2.056, error: null });
  });

  it('rejects an unknown status', () => {
    expect(parseStudioJob({ id: 'vid_1', status: 'weird' })).toBeNull();
  });
});

describe('topic from a tutor answer', () => {
  it('uses the first heading', () => {
    expect(studioTopicFrom('Intro line.\n\n## Krebs cycle — steps\nMore text')).toBe('Krebs cycle — steps');
  });

  it('falls back to the first sentence without markdown', () => {
    expect(studioTopicFrom('**Photosynthesis** do phases mein hota hai. Pehla light reaction.')).toBe('Photosynthesis do phases mein hota hai.');
  });
});
