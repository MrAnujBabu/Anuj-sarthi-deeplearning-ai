import type { TimedSegment } from './youtube-hindi';
import type { InterpreterId } from './interpreter-models';

export const INTERPRET_PIPELINE = 'source-bound-v2';

/** Exact normalized source identity, shared by the server and device recovery. */
export async function interpretationIdentity(segments: TimedSegment[], language: string, source: string, engine: InterpreterId, review: boolean, deepListen: boolean) {
  const bytes = new TextEncoder().encode(JSON.stringify([INTERPRET_PIPELINE, source, language, engine, review, deepListen, segments]));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function matchingResume(value: unknown, count: number, sourceKey: string) {
  if (!value || typeof value !== 'object' || !count) return null;
  const v = value as Record<string, unknown>;
  if (v['sourceKey'] !== sourceKey || !Array.isArray(v['lines']) || v['lines'].length !== count) return null;
  const lines = v['lines'].map(line => typeof line === 'string' ? line.slice(0, 8000) : '');
  return lines.some(line => line.trim()) ? { lines, brief: v['brief'], briefModel: typeof v['briefModel'] === 'string' ? v['briefModel'].slice(0, 60) : '' } : null;
}