// Adapts an HTML <video>/<audio> element to the dub controller's player contract
// (YouTube state codes: 0 ended, 1 playing, 2 paused, 3 buffering).
import type { DubPlayer } from './youtube-dub-sync';

export const HTML_PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function htmlMediaDubPlayer(el: HTMLMediaElement): DubPlayer {
  return {
    playVideo: () => { void el.play().catch(() => { /* paused by the browser; state stays 2 */ }); },
    pauseVideo: () => el.pause(),
    mute: () => { el.muted = true; },
    unMute: () => { el.muted = false; },
    seekTo: (time: number) => { el.currentTime = Math.max(0, time); },
    getCurrentTime: () => el.currentTime,
    getPlayerState: () => (el.ended ? 0 : el.paused ? 2 : el.seeking || el.readyState < 3 ? 3 : 1),
    getPlaybackRate: () => el.playbackRate,
    setPlaybackRate: (rate: number) => { el.playbackRate = rate; },
    getAvailablePlaybackRates: () => HTML_PLAYBACK_RATES,
  };
}
