// Server-only AI Studio calls: ByteDance Seedream (images), ByteDance Seedance (animations),
// Topaz Starlight (video restoration). Prompts and gateway credentials never reach the browser.
import {
  generateImageStream, generateVideo, getVideo, downloadVideo,
  GatewayError, PaymentRequiredError, RateLimitError, PermissionDeniedError, RequestRejectedError,
  ConfigurationError, AuthenticationError, CancelledError,
} from '@lovable.dev/ai-gateway';
import {
  IMAGE_ORIENTATIONS, parseStudioJob, studioAnimationPrompt, studioImagePrompt, ENHANCE_TARGETS,
  type AnimationAspect, type AnimationDuration, type AnimationResolution, type EnhanceContainer, type EnhanceTarget,
  type ImageOrientation, type ImageStyle, type StudioJob,
} from './studio-tools';
import { studioWaitSeconds } from './studio-recovery';

export class StudioError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Maps SDK failures to a status and a short Hinglish message; remembers credit exhaustion. */
export async function studioFailure(error: unknown, vendor = 'Yeh AI model'): Promise<{ status: number; message: string; retryAfterSeconds?: number }> {
  if (error instanceof StudioError) return { status: error.status, message: error.message };
  if (error instanceof CancelledError || (error instanceof Error && error.name === 'AbortError')) return { status: 499, message: 'Roka gaya.' };
  if (error instanceof PaymentRequiredError) {
    const message = 'AI credits khatam ho gaye — workspace mein credits jodkar phir chalaiye.';
    const { setAiPause } = await import('./ai/pause.server');
    await setAiPause({ kind: 'credits', message, status: 402 });
    return { status: 402, message };
  }
  if (error instanceof ConfigurationError || error instanceof AuthenticationError) return { status: 503, message: 'AI connection is workspace mein setup nahi hai.' };
  if (error instanceof RateLimitError) {
    const retryAfterSeconds = studioWaitSeconds(error.retryAfter);
    console.warn('[studio] rate limited', error.code, error.ids?.logId, error.ids?.requestId, retryAfterSeconds);
    return { status: 429, message: `AI abhi busy hai — ${retryAfterSeconds} second baad phir try kariye.`, retryAfterSeconds };
  }
  if (error instanceof PermissionDeniedError) {
    const remote = (error as { remote?: { type?: unknown } }).remote;
    if (remote?.type === 'model_vendor_not_enabled') {
      return { status: 403, message: `${vendor} is workspace mein abhi band hai. Workspace owner/admin Connectors → Admin settings mein ${vendor} on kare, phir dobara try kariye.` };
    }
    return { status: 403, message: `${vendor} abhi is workspace ke liye available nahi hai.` };
  }
  if (error instanceof RequestRejectedError) {
    console.error('[studio] request rejected', error.message);
    return { status: 400, message: 'AI ne yeh request mana kar di — topic badal ke try kariye.' };
  }
  if (error instanceof GatewayError) {
    console.error('[studio] gateway error', error.code, error.httpStatus, error.message);
    return { status: error.httpStatus && error.httpStatus >= 400 ? error.httpStatus : 503, message: 'AI se jawab nahi mila. Thodi der baad phir try kariye.' };
  }
  console.error('[studio] failed', error instanceof Error ? error.message : error);
  return { status: 500, message: 'Kuch gadbad ho gayi. Phir try kariye.' };
}

export async function assertAiAvailable() {
  const { getAiPause } = await import('./ai/pause.server');
  const paused = await getAiPause();
  if (paused) throw new StudioError(paused.message || 'AI abhi ruka hua hai.', paused.kind === 'credits' ? 402 : 403);
}

async function noteSuccess() {
  const { noteAiSuccess } = await import('./ai/pause.server');
  await noteAiSuccess();
}

/** One Seedream image as a PNG/JPEG data URL. */
export async function createStudioImage(input: { style: ImageStyle; topic: string; details: string; orientation: ImageOrientation }, signal: AbortSignal) {
  const stream = await generateImageStream({
    model: 'bytedance/seedream-5-pro',
    input: {
      prompt: studioImagePrompt(input.style, input.topic, input.details),
      size: IMAGE_ORIENTATIONS[input.orientation],
      watermark: false,
    },
  }, { signal });
  // Failure frames throw GatewayError during iteration; only completed images arrive here.
  for await (const event of stream) {
    if (event.type === 'image_generation.completed' && event.b64_json) {
      await noteSuccess();
      const b64 = event.b64_json;
      const mime = b64.startsWith('/9j/') ? 'image/jpeg' : b64.startsWith('UklG') ? 'image/webp' : 'image/png';
      return `data:${mime};base64,${b64}`;
    }
  }
  throw new StudioError('Image nahi ban paayi — phir try kariye.', 502);
}

function asJob(raw: unknown): StudioJob {
  const job = parseStudioJob(raw);
  if (!job) throw new StudioError('Video job ka jawab samajh nahi aaya.', 502);
  return job;
}

/** Starts a Seedance concept animation and returns the job (poll with readStudioJob). */
export async function startAnimation(input: { topic: string; details: string; duration: AnimationDuration; resolution: AnimationResolution; aspect: AnimationAspect }) {
  const raw = await generateVideo({
    model: 'bytedance/seedance-2.5',
    input: {
      prompt: studioAnimationPrompt(input.topic, input.details),
      duration: input.duration,
      resolution: input.resolution,
      aspect_ratio: input.aspect,
      generate_audio: false,
      watermark: false,
      output_format: 'mp4',
    },
  });
  await noteSuccess();
  return asJob(raw);
}

/** Starts a Topaz Starlight restoration of a clip already uploaded to temporary storage. */
export async function startEnhance(input: {
  videoUrl: string; container: EnhanceContainer; width: number; height: number;
  frameCount: number; frameRate: number; startIndex: number; endIndex: number; target: EnhanceTarget;
}) {
  const raw = await generateVideo({
    model: 'topazlabs/starlight-fast-2',
    input: {
      video_uri: input.videoUrl,
      source_container: input.container,
      source_width: input.width,
      source_height: input.height,
      frame_count: input.frameCount,
      frame_rate: input.frameRate,
      start_index: input.startIndex,
      end_index: input.endIndex,
      target_resolution: ENHANCE_TARGETS[input.target],
      upscaling_factor: 1,
    },
  });
  await noteSuccess();
  return asJob(raw);
}

export async function readStudioJob(id: string) {
  return asJob(await getVideo(id));
}

export async function studioVideoFile(id: string, download: boolean) {
  const binary = await downloadVideo(id);
  const headers: Record<string, string> = { 'Cache-Control': 'private, max-age=3600' };
  if (download) headers['Content-Disposition'] = `attachment; filename="snapsolve-${id.slice(-8)}.mp4"`;
  return binary.toResponse({ headers });
}

// ---------- Temporary upload storage for Topaz ----------
export const STUDIO_BUCKET = 'studio-temp';
const UPLOAD_PATH_RE = /^topaz\/\d{13}-[0-9a-f-]{36}\.(mp4|mov|m4v)$/;
export const isStudioUploadPath = (path: string) => UPLOAD_PATH_RE.test(path);

async function admin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}

/** Signed one-time upload slot; also clears uploads older than six hours. */
export async function createUploadSlot(container: EnhanceContainer) {
  const sb = await admin();
  void sweepOldUploads(sb);
  const path = `topaz/${Date.now()}-${crypto.randomUUID()}.${container}`;
  const { data, error } = await sb.storage.from(STUDIO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new StudioError('Upload ki jagah nahi ban paayi.', 503);
  return { path, token: data.token };
}

export async function signedReadUrl(path: string) {
  const sb = await admin();
  const { data, error } = await sb.storage.from(STUDIO_BUCKET).createSignedUrl(path, 6 * 60 * 60);
  if (error || !data?.signedUrl) throw new StudioError('Upload ki hui video nahi mili — phir se upload kariye.', 404);
  return data.signedUrl;
}

export async function removeUpload(path: string) {
  const sb = await admin();
  const { error } = await sb.storage.from(STUDIO_BUCKET).remove([path]);
  if (error) throw new StudioError('Temporary video abhi delete nahi hui — cleanup dobara try kariye.', 503);
}

async function sweepOldUploads(sb: Awaited<ReturnType<typeof admin>>) {
  try {
    const { data } = await sb.storage.from(STUDIO_BUCKET).list('topaz', { limit: 100, sortBy: { column: 'created_at', order: 'asc' } });
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    const old = (data ?? []).filter(f => Number(f.name.split('-')[0]) < cutoff).map(f => `topaz/${f.name}`);
    if (old.length) await sb.storage.from(STUDIO_BUCKET).remove(old);
  } catch (e) {
    console.error('[studio] sweep failed', e instanceof Error ? e.message : e);
  }
}
