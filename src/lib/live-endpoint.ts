// Public addresses only, never credentials.
export const VERCEL_APP_ORIGIN = 'https://snapsolveanuj.vercel.app';
/** This project's published relay: its address survives workspace moves and gets every relay update on publish. */
export const HOSTED_LIVE_ENDPOINT = 'https://repo-compass-companion.lovable.app/api/public/live';

export function liveEndpoint(pageUrl: string, override?: string): string {
  const page = new URL(pageUrl);
  const endpoint = new URL(override ?? (page.origin === VERCEL_APP_ORIGIN ? HOSTED_LIVE_ENDPOINT : '/api/live'), page);
  if (endpoint.username || endpoint.password) throw new Error('Invalid voice connection URL');
  if (endpoint.protocol === 'https:') endpoint.protocol = 'wss:';
  if (endpoint.protocol === 'http:') endpoint.protocol = 'ws:';
  if (!['ws:', 'wss:'].includes(endpoint.protocol) || (page.protocol === 'https:' && endpoint.protocol !== 'wss:')) throw new Error('Voice requires a secure WebSocket connection');
  return endpoint.href;
}

/**
 * The HTTPS address to warm before a call when the relay lives on another
 * site (Vercel → published relay). A cold relay adds DNS, TLS and start-up
 * time to the first call; one cheap request on page open removes it.
 * Same-site relays are already warm from loading the page, so they return null.
 */
export function relayWarmupUrl(pageUrl: string, override?: string): string | null {
  const page = new URL(pageUrl);
  const endpoint = new URL(liveEndpoint(pageUrl, override));
  endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
  return endpoint.origin === page.origin ? null : endpoint.href;
}

/** Fire-and-forget warm-up; never throws and never opens a voice session. */
export function prewarmLiveRelay(pageUrl: string, override?: string): void {
  try {
    const url = relayWarmupUrl(pageUrl, override);
    if (url) void fetch(url, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }).catch(() => {});
  } catch {
    /* warm-up is optional */
  }
}
