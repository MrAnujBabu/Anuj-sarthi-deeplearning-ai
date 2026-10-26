export type AiFailure = { kind: 'credits' | 'denied' | 'configuration' | 'error'; message: string; status: number };
const KEY_REGISTRY_TYPES = ['lovable_api_key_not_registered', 'lovable_api_key_registry_lookup_failed'];
const KEY_REGISTRY_MESSAGE = /LOVABLE_API_KEY is not registered|not registered for this project|AI key is out of date for this workspace/i;
export const STALE_KEY_MESSAGE = "This site's AI key is out of date for this workspace (for example after a workspace move). Update the key on the hosting site; this is not a credit-balance error.";
/** A stale or unregistered app key is a setup problem fixed by updating the key, never a provider denial worth persisting. */
export function isKeyRegistryProblem(message: string, type = '') {
  return KEY_REGISTRY_TYPES.includes(type) || KEY_REGISTRY_MESSAGE.test(message);
}
export function classifyAiFailure(status: number, body: unknown): AiFailure {
  const b = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const nested = b['error'] && typeof b['error'] === 'object' ? b['error'] as Record<string, unknown> : b;
  const type = String(nested['type'] ?? b['type'] ?? '');
  const message = typeof nested['message'] === 'string' ? nested['message'] : typeof b['message'] === 'string' ? b['message'] : typeof body === 'string' ? body : '';
  const credits = status === 402 || (status === 403 && ['credit_limit_reached', 'ai_disabled', 'workspace_ai_disabled'].includes(type));
  if (!credits && isKeyRegistryProblem(message, type)) return { status, kind: 'configuration', message: STALE_KEY_MESSAGE };
  // "Unknown model" / invalid model is a setup problem, never a credit problem.
  // 401 from the AI gateway means the workspace AI connection is stale (for example after a workspace move), not a user-auth problem.
  const configuration = !credits && (status === 401 || /unknown model|model.*not (found|supported|available)|invalid model/i.test(message) || type === 'invalid_model' || status === 404);
  return {
    status,
    kind: credits ? 'credits' : configuration ? 'configuration' : status === 403 ? 'denied' : 'error',
    message: (status === 401 ? '' : message) || (credits ? 'AI credits are unavailable. Restore workspace credits to continue.' : status === 401 ? 'The AI connection is not authorized for this workspace. Restore the Lovable AI connection after the workspace move; this is not a credit-balance error.' : status === 403 ? 'Access to this AI model is blocked. Restore access before starting a new request.' : 'The tutor could not finish. Please try again later.'),
  };
}
export function encodeAiFailure(f: AiFailure) { return `[AI_${f.kind.toUpperCase()}] ${f.message}`; }
export function isCreditError(message: string) { return message.startsWith('[AI_CREDITS]'); }
export function isConfigurationError(message: string) { return message.startsWith('[AI_CONFIGURATION]') || /unknown model/i.test(message); }
export function displayAiError(message: string) { return message.replace(/^\[AI_[A-Z]+\]\s*/, ''); }
