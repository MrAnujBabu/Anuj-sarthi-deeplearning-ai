import { describe, it, expect, vi } from 'vitest';
import { dubVideoRate, dubAlignedRate, dubSeeked, segmentAtTime, runDubPlayback } from '@/lib/youtube-dub-sync';
import { youtubeVoiceProfile } from '@/lib/youtube-voice-profile';

describe('YouTube synchronized narration', () => {
  it('fits video to longer speech without speeding up or pitching the voice', () => {
    expect(dubVideoRate(40, 30, [0.25, 0.5, 0.75, 1, 1.5, 2])).toBe(0.75);
    expect(dubVideoRate(20, 30, [0.25, 0.5, 1, 2])).toBe(1);
  });
  it('detects forward and backward seeks but not normal playback or buffering', () => {
    expect(dubSeeked(10, 10.06, 0.06, 1, true)).toBe(false);
    expect(dubSeeked(10, 10, 0.06, 1, false)).toBe(false);
    expect(dubSeeked(10, 40, 0.06, 1, true)).toBe(true);
    expect(dubSeeked(40, 10, 0.06, 1, true)).toBe(true);
  });
  it('selects the timestamp containing a seek and recognizes the end', () => {
    const s = [{ start: 0, end: 30, hindi: 'a' }, { start: 30, end: 60, hindi: 'b' }];
    expect(segmentAtTime(s, 35)).toBe(1);
    expect(segmentAtTime(s, 5)).toBe(0);
    expect(segmentAtTime(s, 60)).toBe(-1);
  });
  it('never replays finished narration when seeking into a silent gap', () => {
    const s = [{ start: 1, end: 22, hindi: 'पहला।' }, { start: 40, end: 45, hindi: 'दूसरा।' }];
    expect(segmentAtTime(s, 25)).toBe(1);
    expect(segmentAtTime(s, 45)).toBe(-1);
  });
  it('corrects video timing towards the remaining natural-speed audio', () => {
    expect(dubAlignedRate(8, 6, [0.25, 0.5, 0.75, 1, 1.5])).toBe(0.75);
    expect(dubAlignedRate(5, 6, [0.5, 0.75, 1, 2])).toBe(1);
    expect(dubAlignedRate(10, 6, [0.5, 0.75, 1])).toBe(0.5);
  });
  it('seeks into speech proportionally and corrects video drift without restarting the voice', async () => {
    vi.useFakeTimers();
    const wallClock = vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
    let time = 5, audioTime = 0;
    const start = vi.fn(), stop = vi.fn();
    const ctx = { state: 'running', get currentTime() { return audioTime; }, destination: {}, resume: vi.fn(), suspend: vi.fn(),
      createBufferSource: () => ({ connect: vi.fn(), disconnect: vi.fn(), start, stop, onended: null }) } as unknown as AudioContext;
    const p = { getCurrentTime: () => time, getPlayerState: () => 1, getPlaybackRate: () => 1, getAvailablePlaybackRates: () => [0.5, 0.75, 1],
      setPlaybackRate: vi.fn(), mute: vi.fn(), unMute: vi.fn(), seekTo: vi.fn(), playVideo: vi.fn(), pauseVideo: vi.fn() };
    const ctl = new AbortController();
    const task = runDubPlayback({ player: p, context: ctx, segments: [{ start: 0, end: 20, hindi: 'test' }], from: 0,
      signal: ctl.signal, getAudio: async () => ({ duration: 30 }) as AudioBuffer, update: vi.fn(), paused: () => false, holding: vi.fn() }).catch(e => e);
    try {
      await vi.advanceTimersByTimeAsync(120);
      expect(start.mock.calls[0]?.[1]).toBe(7.5);
      p.setPlaybackRate.mockClear();
      for (let i = 0; i < 12; i++) { time += 0.3; audioTime += 0.06; await vi.advanceTimersByTimeAsync(60); }
      expect(p.setPlaybackRate).toHaveBeenCalledWith(0.5);
      expect(start).toHaveBeenCalledTimes(1);
      expect(stop).not.toHaveBeenCalled();
      ctl.abort(); await vi.advanceTimersByTimeAsync(120); await task;
      expect(p.setPlaybackRate).toHaveBeenLastCalledWith(1);
    } finally { wallClock.mockRestore(); vi.useRealTimers(); }
  });
  it('preserves distinct Ishita and Ratan delivery identities on backup', () => {
    expect(youtubeVoiceProfile('ishita_hi_edtech')?.voiceName).toBe('Kore');
    expect(youtubeVoiceProfile('ishita_hi_edtech')?.gender).toBe('female');
    expect(youtubeVoiceProfile('ratan_hi_customer_expressive')?.voiceName).toBe('Fenrir');
    expect(youtubeVoiceProfile('ratan_hi_customer_expressive')?.gender).toBe('male');
    expect(youtubeVoiceProfile('untrusted')).toBeUndefined();
  });
  it('does not pause the video or reload audio when the next timestamp is already prefetched', async () => {
    vi.useFakeTimers();
    let time = 0.1, state = 1;
    const sources: { onended: (() => void) | null }[] = [];
    const ctx = { state: 'running', currentTime: 0, destination: {}, resume: vi.fn(), suspend: vi.fn(),
      createBufferSource: () => { const source = { onended: null as (() => void) | null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; sources.push(source); return source; } } as unknown as AudioContext;
    const p = { getCurrentTime: () => time, getPlayerState: () => state, getPlaybackRate: () => 1, getAvailablePlaybackRates: () => [1],
      setPlaybackRate: vi.fn(), mute: vi.fn(), unMute: vi.fn(), seekTo: vi.fn(), playVideo: vi.fn(() => { state = 1; }), pauseVideo: vi.fn(() => { state = 2; }) };
    const ctl = new AbortController(), buffer = { duration: 0.8 } as AudioBuffer;
    const task = runDubPlayback({ player: p, context: ctx, segments: [{ start: 0, end: 1, hindi: 'one' }, { start: 1, end: 2, hindi: 'two' }], from: 0,
      signal: ctl.signal, getAudio: async () => buffer, readyAudio: () => buffer, update: vi.fn(), paused: () => false, holding: vi.fn() }).catch(error => error);
    try {
      await vi.advanceTimersByTimeAsync(120);
      const pauses = p.pauseVideo.mock.calls.length;
      sources[0]?.onended?.(); time = 1.01;
      await vi.advanceTimersByTimeAsync(120);
      expect(sources.length).toBe(2); expect(p.pauseVideo.mock.calls.length).toBe(pauses);
      ctl.abort(); await vi.advanceTimersByTimeAsync(120); await task;
    } finally { vi.useRealTimers(); }
  });
  it('reports spoken-audio progress from 0 to 1 for word highlighting', async () => {
    vi.useFakeTimers();
    let time = 0.1, state = 1, audioTime = 0;
    const sources: { onended: (() => void) | null }[] = [];
    const ctx = { get currentTime() { return audioTime; }, state: 'running', destination: {}, resume: vi.fn(), suspend: vi.fn(),
      createBufferSource: () => { const source = { onended: null as (() => void) | null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; sources.push(source); return source; } } as unknown as AudioContext;
    const p = { getCurrentTime: () => time, getPlayerState: () => state, getPlaybackRate: () => 1, getAvailablePlaybackRates: () => [1],
      setPlaybackRate: vi.fn(), mute: vi.fn(), unMute: vi.fn(), seekTo: vi.fn(), playVideo: vi.fn(() => { state = 1; }), pauseVideo: vi.fn(() => { state = 2; }) };
    const ctl = new AbortController(), buffer = { duration: 0.8 } as AudioBuffer;
    const seen: [number, number][] = [];
    const task = runDubPlayback({ player: p, context: ctx, segments: [{ start: 0, end: 1, hindi: 'one two' }], from: 0,
      signal: ctl.signal, getAudio: async () => buffer, readyAudio: () => buffer, update: vi.fn(), paused: () => false, holding: vi.fn(),
      progress: (i, f) => { seen.push([i, f]); } }).catch(error => error);
    try {
      await vi.advanceTimersByTimeAsync(120);
      expect(seen[0]).toEqual([0, 0]);
      for (let i = 0; i < 5; i++) { audioTime += 0.1; time += 0.1; await vi.advanceTimersByTimeAsync(60); }
      const mid = seen.filter(([, f]) => f > 0 && f < 1);
      expect(mid.length).toBeGreaterThan(0);
      for (let i = 1; i < mid.length; i++) expect(mid[i]![1]).toBeGreaterThanOrEqual(mid[i - 1]![1]);
      audioTime = 1; sources[0]?.onended?.(); time = 1.01;
      await vi.advanceTimersByTimeAsync(120);
      expect(seen.at(-1)).toEqual([0, 1]);
      ctl.abort(); await vi.advanceTimersByTimeAsync(120); await task;
    } finally { vi.useRealTimers(); }
  });
  it('suspends Hindi on native pause and buffering, resumes on playback, and stops on cancellation', async () => {
    vi.useFakeTimers();
    let state = 1, clockState = 'running';
    const stop = vi.fn(), suspend = vi.fn(async () => { clockState = 'suspended'; }), resume = vi.fn(async () => { clockState = 'running'; });
    const ctx = { get state() { return clockState; }, currentTime: 0, destination: {}, resume, suspend,
      createBufferSource: () => ({ connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop, onended: null }) } as unknown as AudioContext;
    const p = { getCurrentTime: () => 0.1, getPlayerState: () => state, getPlaybackRate: () => 1, getAvailablePlaybackRates: () => [1],
      setPlaybackRate: vi.fn(), mute: vi.fn(), unMute: vi.fn(), seekTo: vi.fn(), playVideo: vi.fn(() => { state = 1; }), pauseVideo: vi.fn(() => { state = 2; }) };
    const ctl = new AbortController();
    const task = runDubPlayback({ player: p, context: ctx, segments: [{ start: 0, end: 30, hindi: 'test' }], from: 0,
      signal: ctl.signal, getAudio: async () => ({ duration: 10 }) as AudioBuffer, update: vi.fn(), paused: () => false, holding: vi.fn() });
    const outcome = task.catch(error => error);
    try {
      await vi.advanceTimersByTimeAsync(120);
      state = 2; await vi.advanceTimersByTimeAsync(120); expect(clockState).toBe('suspended');
      state = 1; await vi.advanceTimersByTimeAsync(120); expect(clockState).toBe('running');
      state = 3; await vi.advanceTimersByTimeAsync(120); expect(clockState).toBe('suspended');
      ctl.abort(); await vi.advanceTimersByTimeAsync(120);
      expect((await outcome).name).toBe('AbortError'); expect(stop).toHaveBeenCalled(); expect(p.unMute).toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
});