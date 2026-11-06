import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const GATEWAY = 'https://connector-gateway.lovable.dev/telegram';
const CHANNEL = '-1003923655922';
export const TELEGRAM_PREVIEW_MAX = 20 * 1024 * 1024;
const Ref = z.object({ fileId: z.string().min(1).max(500), title: z.string().max(160), kind: z.enum(['image', 'video']), mime: z.enum(['image/png', 'image/jpeg', 'image/webp', 'video/mp4']).default('image/png'), messageId: z.number().int().positive() });

function headers() {
  const app = process.env['LOVABLE_API_KEY'];
  const key = process.env['TELEGRAM_API_KEY'];
  if (!app || !key) throw new Error('Telegram connection setup nahi hai.');
  return { Authorization: `Bearer ${app}`, 'X-Connection-Api-Key': key };
}
function signingKey() {
  const key = process.env['STUDIO_TELEGRAM_SIGNING_KEY'];
  if (!key) throw new Error('Telegram preview setup nahi hai.');
  return key;
}
function signature(value: string) { return createHmac('sha256', signingKey()).update(value).digest('base64url'); }
export function encodeTelegramRef(ref: z.input<typeof Ref>) {
  const payload = Buffer.from(JSON.stringify(Ref.parse(ref))).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export function decodeTelegramRef(token: string) {
  const [payload, sig] = token.split('.');
  if (!payload || !sig || token.length > 2000) throw new Error('Telegram preview link galat hai.');
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(sig);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Telegram preview link galat hai.');
  return Ref.parse(JSON.parse(Buffer.from(payload, 'base64url').toString()));
}

const TelegramResult = z.object({ ok: z.boolean(), description: z.string().optional(), result: z.unknown().optional() });
async function telegramJson(response: Response) {
  const body = await response.text();
  if (!response.ok) { console.error('[studio telegram]', response.status, body); throw new Error(`Telegram [${response.status}]: ${body}`); }
  const value = TelegramResult.parse(JSON.parse(body));
  if (!value.ok) throw new Error(value.description || 'Telegram ne upload confirm nahi kiya.');
  return value.result;
}

/** Explicit uploads only. Never retry: an uncertain response may already have posted the file. */
export async function sendStudioToTelegram(blob: Blob, title: string, kind: 'image' | 'video') {
  if (!blob.size || blob.size > TELEGRAM_PREVIEW_MAX) throw new Error('App mein Telegram se preview ke liye file 20 MB tak honi chahiye.');
  const mime = z.enum(['image/png', 'image/jpeg', 'image/webp', 'video/mp4']).parse(blob.type);
  if ((kind === 'image') !== mime.startsWith('image/')) throw new Error('Output format galat hai.');
  const form = new FormData();
  form.set('chat_id', CHANNEL);
  form.set('caption', `SnapSolve · ${title}`);
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : kind === 'image' ? 'png' : 'mp4';
  form.set('document', blob, `snapsolve-output.${ext}`);
  const raw = await telegramJson(await fetch(`${GATEWAY}/sendDocument`, { method: 'POST', headers: headers(), body: form }));
  const result = z.object({ message_id: z.number().int().positive(), document: z.object({ file_id: z.string() }) }).parse(raw);
  const token = encodeTelegramRef({ fileId: result.document.file_id, title, kind, mime, messageId: result.message_id });
  return { token, messageUrl: `https://t.me/c/${CHANNEL.slice(4)}/${result.message_id}` };
}

export async function telegramStudioFile(token: string) {
  const ref = decodeTelegramRef(token);
  const result = await telegramJson(await fetch(`${GATEWAY}/getFile`, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: ref.fileId }) }));
  const file = z.object({ file_path: z.string().regex(/^[A-Za-z0-9_./-]+$/), file_size: z.number().optional() }).parse(result);
  if (file.file_path.includes('..') || (file.file_size ?? 0) > TELEGRAM_PREVIEW_MAX) throw new Error('Telegram file preview available nahi hai.');
  const response = await fetch(`${GATEWAY}/file/${file.file_path}`, { headers: headers() });
  if (!response.ok) { console.error('[studio telegram file]', response.status); throw new Error(`Telegram file [${response.status}] nahi mili.`); }
  return new Response(response.body, { headers: { 'Content-Type': ref.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}