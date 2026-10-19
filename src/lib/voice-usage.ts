export function confirmedSeconds(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function billableSeconds(seconds: number | null, created: boolean): number | null {
  return created ? Math.max(15, seconds ?? 0) : null;
}

export type VoiceDocument = { name: string; pages: number; method: string; chars: number };

export function documentMetadata(value: unknown): VoiceDocument[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const r = entry as Record<string, unknown>;
    if (typeof r['name'] !== 'string') return [];
    return [{ name: r['name'].replace(/[\x00-\x1f]/g, '').slice(0, 200),
      pages: typeof r['pages'] === 'number' && Number.isFinite(r['pages']) ? Math.max(0, Math.floor(r['pages'])) : 0,
      method: r['method'] === 'ocr' ? 'ocr' : 'text',
      chars: typeof r['chars'] === 'number' && Number.isFinite(r['chars']) ? Math.max(0, Math.floor(r['chars'])) : 0 }];
  });
}