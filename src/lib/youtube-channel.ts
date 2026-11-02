// Browser-safe YouTube channel helpers: saved quick-pick channels and link parsing.

export type ChannelVideo = { id: string; title: string; duration: string; published: string; views: string; thumbnail: string };
export type ChannelPage = { channel: { id: string; title: string; avatar: string }; videos: ChannelVideo[]; continuation: string | null };

/** The user's main channels (long-form podcasts and talks), shown as quick picks. */
export const SAVED_CHANNELS = [
  { id: 'UC2D2CMWXMOVWx7giW1n3LIg', title: 'Andrew Huberman' },
  { id: 'UCSHZKyawb77ixDdsGog4iWA', title: 'Lex Fridman' },
  { id: 'UCzQUP1qoWDoEbmsQxvdjxgQ', title: 'Joe Rogan (JRE)' },
  { id: 'UCoOae5nYA7VqaXzerajD0lg', title: 'Ali Abdaal' },
  { id: 'UC0QHWhjbe5fGJEPz3sVb6nw', title: 'Doctor Mike' },
  { id: 'UCL_f53ZEJxp8TtlOkHwMV9Q', title: 'Jordan B Peterson' },
  { id: 'UC6Hyj5sVbiYhpc_FA14nziw', title: 'Mikhaila Peterson' },
  { id: 'UCyGi3eCuxko37WB6uUr7LjA', title: 'Call Her Daddy' },
  { id: 'UCmvYCRYPDlzSHVNCI_ViJDQ', title: 'Tiago Forte' },
  { id: 'UCQIycDaLsBpMKjOCeaKUYVg', title: 'CNBC Awaaz' },
] as const;

export type ChannelRef = { kind: 'id'; id: string } | { kind: 'url'; url: string } | { kind: 'playlist'; id: string };

/** Accepts a channel id, /channel/ link, @handle, /c/ or /user/ link. Video links are not channels. */
export function parseChannelInput(input: string): ChannelRef | null {
  const s = input.trim();
  if (!s) return null;
  // Playlist links (also watch?v=…&list=…) and bare playlist ids.
  const list = s.match(/[?&]list=((?:PL|UU|OL|FL|RD)[\w-]{10,})/)?.[1] ?? s.match(/^((?:PL|OL)[\w-]{16,})$/)?.[1];
  if (list && !list.startsWith('RD')) return { kind: 'playlist', id: list };
  const id = s.match(/(?:^|\/channel\/)(UC[\w-]{22})(?:$|[/?#])/)?.[1];
  if (id) return { kind: 'id', id };
  if (/^@[\w.-]{3,}$/.test(s)) return { kind: 'url', url: `https://www.youtube.com/${s}` };
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = url.hostname.replace(/^(www\.|m\.)/, '');
  if (host !== 'youtube.com') return null;
  const m = url.pathname.match(/^\/(@[\w.-]{3,}|c\/[\w.-]+|user\/[\w.-]+)/);
  return m ? { kind: 'url', url: `https://www.youtube.com/${m[1]}` } : null;
}

/** "2:43:38" → seconds; used to warn before very long podcasts. */
export function durationSeconds(text: string) {
  const parts = text.split(':').map(Number);
  if (!parts.length || parts.some(n => !Number.isFinite(n))) return 0;
  return parts.reduce((total, n) => total * 60 + n, 0);
}
