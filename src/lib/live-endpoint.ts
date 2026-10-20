// Public addresses only, never credentials.
export const VERCEL_APP_ORIGIN = 'https://snapsolveanuj.vercel.app';
export const HOSTED_LIVE_ENDPOINT = 'https://project--8cc816c6-dbdd-43ce-8e4c-68672cd4d542.lovable.app/api/public/live';

export function liveEndpoint(pageUrl: string, override?: string): string {
  const page = new URL(pageUrl);
  const endpoint = new URL(override ?? (page.origin === VERCEL_APP_ORIGIN ? HOSTED_LIVE_ENDPOINT : '/api/live'), page);
  if (endpoint.username || endpoint.password) throw new Error('Invalid voice connection URL');
  if (endpoint.protocol === 'https:') endpoint.protocol = 'wss:';
  if (endpoint.protocol === 'http:') endpoint.protocol = 'ws:';
  if (!['ws:', 'wss:'].includes(endpoint.protocol) || (page.protocol === 'https:' && endpoint.protocol !== 'wss:')) throw new Error('Voice requires a secure WebSocket connection');
  return endpoint.href;
}