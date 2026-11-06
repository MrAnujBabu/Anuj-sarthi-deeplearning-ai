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

const OWNER_MARK = /\s*⟦k:([A-Za-z0-9_-]+)⟧$/;

/** Tag a saved pause with the project key it was recorded under. */
export function tagPauseMessage(message: string, owner: string) {
  return `${message.replace(OWNER_MARK, '')} ⟦k:${owner}⟧`;
}
/** The message without its owner tag, for showing to people. */
export function pauseMessageText(message: string | null | undefined) {
  return (message ?? '').replace(OWNER_MARK, '');
}
/**
 * A credits pause belongs to the project key that hit it. When the project moves
 * (new workspace or key) or the row predates tagging, the pause is stale and is dropped,
 * so the new workspace's credits apply immediately. Denials are never auto-dropped.
 */
export function isStaleCreditPause(row: { kind?: string | null; message?: string | null }, owner: string) {
  if (row.kind !== 'credits') return false;
  const tag = (row.message ?? '').match(OWNER_MARK)?.[1];
  return tag !== owner;
}
