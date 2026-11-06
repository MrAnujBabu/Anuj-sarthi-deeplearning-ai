// Browser-safe: asks the server once per page whether Sarvam voice is connected,
// so pages go straight to the backup voice instead of sending requests that fail.
let cached: Promise<boolean> | null = null;

/** True unless the server says Sarvam is not connected. A failed check keeps trying Sarvam (old behaviour). */
export function sarvamAvailable(): Promise<boolean> {
  cached ??= fetch('/api/sarvam-speech', { method: 'GET' })
    .then(r => r.ok ? r.json() as Promise<{ configured?: unknown }> : { configured: true })
    .then(j => j.configured !== false)
    .catch(() => true);
  return cached;
}

/** Tests and a manual reconnect can set or clear the remembered answer. */
export function setSarvamAvailable(value: boolean | null) {
  cached = value === null ? null : Promise.resolve(value);
}
