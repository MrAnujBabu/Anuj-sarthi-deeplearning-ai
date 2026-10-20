import { describe, expect, it } from 'vitest';
import { liveEndpoint } from './live-endpoint';
import { validateLiveUpgrade } from './live-relay.server';

describe('Vercel voice hosting', () => {
  it('keeps the Vercel website while connecting directly to the separate relay', () => {
    expect(liveEndpoint('https://snapsolveanuj.vercel.app/voice')).toBe('wss://project--a3b72608-4a7c-4e2f-ae13-9096b40d7082.lovable.app/api/public/live');
    expect(liveEndpoint('http://localhost:8080/voice')).toBe('ws://localhost:8080/api/live');
  });
  it('preserves secure overrides and rejects insecure published connections', () => {
    expect(liveEndpoint('https://snapsolveanuj.vercel.app/voice', 'wss://relay.example/api/live')).toBe('wss://relay.example/api/live');
    expect(() => liveEndpoint('https://snapsolveanuj.vercel.app/voice', 'ws://relay.example/api/live')).toThrow();
  });
  it('allows only the exact Vercel origin in addition to same-origin calls', () => {
    const request = (origin?: string) => new Request('https://relay.example/api/public/live', { headers: { upgrade: 'websocket', ...(origin ? { origin } : {}) } });
    expect(validateLiveUpgrade(request('https://snapsolveanuj.vercel.app'))).toBeNull();
    expect(validateLiveUpgrade(request('https://relay.example'))).toBeNull();
    expect(validateLiveUpgrade(request('https://snapsolveanuj.vercel.app.evil.example'))?.status).toBe(403);
    expect(validateLiveUpgrade(request())?.status).toBe(403);
  });
});