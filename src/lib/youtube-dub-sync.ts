import type { DubSegment } from './youtube-hindi';

export type DubPlayer = {
  playVideo(): void; pauseVideo(): void; mute(): void; unMute(): void;
  seekTo(time: number, allow: boolean): void; getCurrentTime(): number;
  getPlayerState(): number; getPlaybackRate(): number; setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
};

/** Slow only the video when necessary; the voice's pitch/timbre stays untouched. */
export function dubVideoRate(duration: number, window: number, available: number[]) {
  const fit = window / Math.max(duration, 0.01);
  return available.filter(rate => rate > 0 && rate <= 1 && rate <= fit).sort((a, b) => b - a)[0]
    ?? Math.min(...available.filter(rate => rate > 0 && rate <= 1), 1);
}

export function segmentAtTime(segments: DubSegment[], time: number) {
  return segments.findIndex((segment, i) => time < (segments[i + 1]?.start ?? segment.end));
}

export function dubSeeked(previous: number, current: number, elapsed: number, rate: number, playing: boolean) {
  return Math.abs(current - previous - (playing ? elapsed * rate : 0)) > 1;
}

type Options = {
  player: DubPlayer; context: AudioContext; segments: DubSegment[]; from: number;
  signal: AbortSignal; getAudio(index: number): Promise<AudioBuffer>;
  readyAudio?(index: number): AudioBuffer | undefined;
  update(index: number, status: string): void;
  paused(): boolean; holding(value: boolean): void;
  active?(): boolean;
};
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 60));

/** One audio clock follows observed player state, not accumulated transcript timers. */
export async function runDubPlayback(o: Options) {
  const { player: p, context: ctx, segments, signal } = o;
  const first = segments[o.from];
  if (!first) return;
  const originalRate = p.getPlaybackRate();
  let source: AudioBufferSourceNode | undefined;
  const stopSource = () => { if (source) { source.onended = null; try { source.stop(); } catch { /* already ended */ } source.disconnect(); source = undefined; } };
  const abort = () => stopSource();
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted(); await ctx.resume(); signal.throwIfAborted();
    p.mute(); o.holding(true); p.pauseVideo();
    o.update(o.from, 'Hindi voice तैयार हो रही है…');
    await o.getAudio(o.from); signal.throwIfAborted();
    if (segments[o.from + 1]) void o.getAudio(o.from + 1).catch(() => {});
    if (segments[o.from + 2]) void o.getAudio(o.from + 2).catch(() => {});
    p.seekTo(first.start, true); o.holding(false);
    while (o.paused()) { signal.throwIfAborted(); await tick(); }
    p.playVideo();
    // Wait for the iframe to apply its initial seek before observing jumps.
    while (p.getPlayerState() !== 1) { signal.throwIfAborted(); await tick(); }
    let index = o.from;
    while (index < segments.length) {
      signal.throwIfAborted();
      const seg = segments[index]; if (!seg) break;
      let lastGap = p.getCurrentTime();
      while (p.getCurrentTime() < seg.start - 0.05) {
        signal.throwIfAborted();
        const now = p.getCurrentTime();
        if (now < lastGap - 1) { const target = segmentAtTime(segments, now); if (target >= 0) { index = target; break; } }
        lastGap = now;
        await tick();
      }
      if (segments[index] !== seg) continue;
      // Ready audio crosses boundaries without pause/play handshakes or a loading flash.
      let buffer = o.readyAudio?.(index);
      if (!buffer) {
        o.holding(true); p.pauseVideo();
        o.update(index, 'Hindi voice load हो रही है…');
        buffer = await o.getAudio(index); signal.throwIfAborted();
      }
      if (p.getCurrentTime() >= (segments[index + 1]?.start ?? seg.end)) {
        index = segmentAtTime(segments, p.getCurrentTime());
        if (index < 0) break;
        o.holding(false); continue;
      }
      const end = Math.min(seg.end, segments[index + 1]?.start ?? seg.end);
      const rate = dubVideoRate(buffer.duration, Math.max(0.1, end - seg.start), p.getAvailablePlaybackRates());
      p.setPlaybackRate(rate);
      const offset = Math.min(buffer.duration, Math.max(0, (p.getCurrentTime() - seg.start) / rate));
      if (index + 1 < segments.length) void o.getAudio(index + 1).catch(() => {});
      if (index + 2 < segments.length) void o.getAudio(index + 2).catch(() => {});
      o.update(index, `Hindi voice-over · ${index + 1}/${segments.length}`);
      source = ctx.createBufferSource(); source.buffer = buffer; source.connect(ctx.destination);
      let ended = false; source.onended = () => { ended = true; };
      source.start(ctx.currentTime + 0.03, offset);
      let overrun = false;
      o.holding(false);
      if (!o.paused()) p.playVideo();
      let lastVideo = p.getCurrentTime(), lastWall = performance.now();
      let jumped = false;
      while (!ended) {
        signal.throwIfAborted();
        const now = performance.now(), time = p.getCurrentTime(), state = p.getPlayerState();
        if (dubSeeked(lastVideo, time, (now - lastWall) / 1000, rate, state === 1)) {
          const target = segmentAtTime(segments, time);
          stopSource(); index = target < 0 ? segments.length : target; jumped = true; break;
        }
        lastVideo = time; lastWall = now;
        if (!overrun && time >= end - 0.06) { overrun = true; o.holding(true); p.pauseVideo(); }
        // A deliberate end-of-window hold is the ONLY case where speech continues on paused video.
        const speak = !o.paused() && (overrun || state === 1);
        if (speak && ctx.state === 'suspended') await ctx.resume();
        if (!speak && ctx.state === 'running') await ctx.suspend();
        await tick();
      }
      const nativePaused = !overrun && p.getPlayerState() === 2;
      stopSource(); o.holding(false);
      // Don't undo a native pause merely because the audio reached its end.
      while (nativePaused && p.getPlayerState() === 2) { signal.throwIfAborted(); await tick(); }
      if (jumped) { if (!o.paused()) p.playVideo(); continue; }
      index++;
      while (o.paused()) { signal.throwIfAborted(); await tick(); }
      if (!o.paused()) p.playVideo();
    }
    signal.throwIfAborted();
    o.update(-1, 'Voice-over पूरा हुआ ✓');
  } finally {
    signal.removeEventListener('abort', abort); stopSource(); o.holding(false);
    if (o.active?.() !== false) { p.setPlaybackRate(originalRate); p.pauseVideo(); p.unMute(); }
  }
}