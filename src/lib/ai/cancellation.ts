/** Cancellation is a normal terminal outcome, not a provider failure or retry. */
export function isAiCancellation(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}