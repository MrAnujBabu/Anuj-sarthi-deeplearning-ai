/** Session creation settings cannot be renegotiated without ending a paid call. */
export function voiceSettingsLocked(status: 'idle' | 'connecting' | 'connected' | 'stopping' | 'closed'): boolean {
  return status !== 'idle' && status !== 'closed';
}