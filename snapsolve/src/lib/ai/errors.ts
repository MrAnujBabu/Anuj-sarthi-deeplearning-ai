export type AiFailure = { kind: 'credits' | 'denied' | 'error'; message: string; status: number };
export function classifyAiFailure(status: number, body: unknown): AiFailure {
  const b = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const nested = b['error'] && typeof b['error'] === 'object' ? b['error'] as Record<string, unknown> : b;
  const type = String(nested['type'] ?? b['type'] ?? '');
  const message = typeof nested['message'] === 'string' ? nested['message'] : typeof b['message'] === 'string' ? b['message'] : '';
  const credits = status === 402 || (status === 403 && ['credit_limit_reached', 'ai_disabled', 'workspace_ai_disabled'].includes(type));
  return {
    status,
    kind: credits ? 'credits' : status === 403 ? 'denied' : 'error',
    message: message || (credits ? 'AI credits are unavailable. Restore workspace credits to continue.' : status === 403 ? 'Access to this AI model is blocked. Restore access before starting a new request.' : 'The tutor could not finish. Please try again later.'),
  };
}
export function encodeAiFailure(f: AiFailure) { return `[AI_${f.kind.toUpperCase()}] ${f.message}`; }
export function isCreditError(message: string) { return message.startsWith('[AI_CREDITS]'); }
export function displayAiError(message: string) { return message.replace(/^\[AI_[A-Z]+\]\s*/, ''); }