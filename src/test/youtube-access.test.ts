import { describe, expect, it } from 'vitest';
import { canTryYouTubeListening } from '@/lib/youtube-access';

describe('YouTube transcription access', () => {
  it('never lets a title override private or age restrictions', () => {
    expect(canTryYouTubeListening({ status: 'LOGIN_REQUIRED', title: 'Known title', reason: 'This is a private video' })).toBe(false);
    expect(canTryYouTubeListening({ status: 'LOGIN_REQUIRED', title: 'Known title', reason: 'Sign in to confirm your age' })).toBe(false);
  });
  it('tries independent listening when a bot check omits video details', () => {
    expect(canTryYouTubeListening({ status: 'LOGIN_REQUIRED', title: '', reason: 'Sign in to confirm you’re not a bot' })).toBe(true);
    expect(canTryYouTubeListening({ status: 'LOGIN_REQUIRED', title: '', reason: "Sign in to confirm you're not a bot" })).toBe(true);
  });
  it('does not attempt listening to an explicitly private video', () => {
    expect(canTryYouTubeListening({ status: 'LOGIN_REQUIRED', title: '', reason: 'This is a private video. Please sign in.' })).toBe(false);
  });
  it('does not attempt listening to an age-restricted video without details', () => {
    expect(canTryYouTubeListening({ status: 'LOGIN_REQUIRED', title: '', reason: 'Sign in to confirm your age' })).toBe(false);
  });
  it('does not attempt listening to a removed video', () => {
    expect(canTryYouTubeListening({ status: 'ERROR', title: '', reason: 'Video unavailable' })).toBe(false);
  });
});