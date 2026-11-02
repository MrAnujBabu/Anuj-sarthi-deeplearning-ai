// Pure policy for remembered AI pauses (kept separate so it can be unit-tested without a database).

/** How long a credits pause blocks before one probe request may check whether credits were added. */
export const CREDIT_PROBE_MS = 10 * 60_000;

/** 'block' = keep refusing; 'probe' = cooldown over, let one request test the gateway. Denials never probe. */
export function creditPauseDecision(row: { kind?: string | null; updated_at?: string | null }, now: number): 'block' | 'probe' {
  if (row.kind !== 'credits') return 'block';
  const at = Date.parse(row.updated_at ?? '');
  if (!Number.isFinite(at)) return 'probe';
  return now - at >= CREDIT_PROBE_MS ? 'probe' : 'block';
}
