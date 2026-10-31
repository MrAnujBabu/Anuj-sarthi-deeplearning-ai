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
  // A gap belongs to the upcoming segment, never to already-finished speech.
  return segments.findIndex(segment => time < segment.end);
}

/** Fit the remaining video to the observed audio clock, without changing voice speed/pitch. */
export function dubAlignedRate(audioLeft: number, videoLeft: number, available: number[]) {
  const rates = available.filter(rate => rate > 0 && rate <= 1);
  return rates.sort((a, b) => Math.abs(videoLeft / a - audioLeft) - Math.abs(videoLeft / b - audioLeft))[0] ?? 1;
}

export function dubSeeked(previous: number, current: number, elapsed: number, rate: number, playing: boolean) {
  return Math.abs(current - previous - (playing ? elapsed * rate : 0)) > 1;
}

type Options = {
  player: DubPlayer; context: AudioContext; segments: DubSegment[]; from: number;
  signal: AbortSignal; getAudio(index: number): Promise<AudioBuffer>;
  readyAudio?(index: number): AudioBuffer | undefined;
  update(index: number, status: string): void;
  /** Fraction (0–1) of the current segment's audio already spoken; freezes while paused. */
  progress?(index: number, fraction: number): void;
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
    let preserveNativePause = false;
    while (index < segments.length) {
      signal.throwIfAborted();
      while (preserveNativePause && p.getPlayerState() === 2) { signal.throwIfAborted(); await tick(); }
      preserveNativePause = false;
      const seg = segments[index]; if (!seg) break;
      while (p.getCurrentTime() < seg.start - 0.05) {
        signal.throwIfAborted();
        p.setPlaybackRate(originalRate);
        if (o.paused()) p.pauseVideo();
        const now = p.getCurrentTime();
        const target = segmentAtTime(segments, now);
        if (target !== index) { index = target < 0 ? segments.length : target; break; }
        if (p.getPlayerState() === 0) { index = segments.length; break; }
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
      if (p.getCurrentTime() >= seg.end) {
        index = segmentAtTime(segments, p.getCurrentTime());
        if (index < 0) break;
        o.holding(false); continue;
      }
      const end = Math.min(seg.end, segments[index + 1]?.start ?? seg.end);
      const available = p.getAvailablePlaybackRates();
      let rate = dubAlignedRate(buffer.duration, Math.max(0.1, end - seg.start), available);
      p.setPlaybackRate(rate);
      const offset = Math.min(buffer.duration, Math.max(0, (p.getCurrentTime() - seg.start) / Math.max(0.1, end - seg.start) * buffer.duration));
      if (index + 1 < segments.length) void o.getAudio(index + 1).catch(() => {});
      if (index + 2 < segments.length) void o.getAudio(index + 2).catch(() => {});
      o.update(index, `Hindi voice-over · ${index + 1}/${segments.length}`);
      if (o.paused() || p.getPlayerState() !== 1) await ctx.suspend();
      source = ctx.createBufferSource(); source.buffer = buffer; source.connect(ctx.destination);
      let ended = false; source.onended = () => { ended = true; };
      const audioStart = ctx.currentTime + 0.03;
      source.start(audioStart, offset);
      let overrun = false;
      o.holding(false);
      if (!o.paused()) p.playVideo();
      o.progress?.(index, 0);
      let lastVideo = p.getCurrentTime(), lastWall = performance.now();
      let lastCorrection = lastWall;
      let jumped = false;
      while (!ended) {
        signal.throwIfAborted();
        const now = performance.now(), time = p.getCurrentTime(), state = p.getPlayerState();
        // The audio clock freezes while suspended, so the highlight holds during pauses and holds.
        o.progress?.(index, Math.min(1, Math.max(0, (ctx.currentTime - audioStart) / Math.max(0.01, buffer.duration - offset))));
        if (dubSeeked(lastVideo, time, (now - lastWall) / 1000, rate, state === 1)) {
          const target = segmentAtTime(segments, time);
          preserveNativePause = state === 2 && !overrun;
          stopSource(); index = target < 0 ? segments.length : target; jumped = true; break;
        }
        lastVideo = time; lastWall = now;
        if (!overrun && state === 1 && now - lastCorrection >= 600) {
          const audioLeft = buffer.duration - offset - Math.max(0, ctx.currentTime - audioStart);
          if (audioLeft > 0.15 && end - time > 0.05) {
            const aligned = dubAlignedRate(audioLeft, end - time, available);
            if (aligned !== rate) { rate = aligned; p.setPlaybackRate(rate); }
          }
          lastCorrection = now;
        }
        if (!overrun && time >= end - 0.06) { overrun = true; o.holding(true); p.pauseVideo(); }
        // A deliberate end-of-window hold is the ONLY case where speech continues on paused video.
        const speak = !o.paused() && (overrun || state === 1);
        if (speak && ctx.state === 'suspended') await ctx.resume();
        if (!speak && ctx.state === 'running') await ctx.suspend();
        await tick();
      }
      const nativePaused = !overrun && p.getPlayerState() === 2;
      stopSource(); o.holding(false);
      if (!jumped) o.progress?.(index, 1);
      if (jumped) { if (!o.paused() && !preserveNativePause) p.playVideo(); continue; }
      // Don't undo a native pause merely because the audio reached its end.
      while (nativePaused && p.getPlayerState() === 2) { signal.throwIfAborted(); await tick(); }
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