// Pure helpers for racing a slow provider against a cheaper fallback.
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run `primary`; when it settles quickly, behave like the sequential path:
 * - usable result (`ok`) → return it;
 * - unusable result or rejection → run `fallback` instead.
 * When `primary` is still running after `delayMs`, start `fallback` too and
 * return the first usable result. If neither is usable, behave like awaiting
 * `primary` alone (its value, or its rejection). Never double-starts the fallback.
 */
export async function earlyFallback<T>(primary: Promise<T>, makeFallback: () => Promise<T>, delayMs: number, ok: (v: T) => boolean): Promise<T> {
  const r = await Promise.race([
    primary.then((v) => ({ kind: 'settled' as const, v }), (e) => ({ kind: 'failed' as const, e })),
    sleep(delayMs).then(() => ({ kind: 'slow' as const })),
  ]);
  if (r.kind === 'slow') {
    const fb = makeFallback();
    const winner = await Promise.race([
      primary.then((v) => (ok(v) ? { v } : undefined), () => undefined),
      fb.then((v) => (ok(v) ? { v } : undefined), () => undefined),
    ]);
    if (winner) return winner.v;
    const settled = await Promise.allSettled([primary, fb]);
    return settled[0].status === 'fulfilled' ? settled[0].value : Promise.reject(settled[0].reason);
  }
  if (r.kind === 'settled' && ok(r.v)) return r.v;
  return makeFallback();
}
