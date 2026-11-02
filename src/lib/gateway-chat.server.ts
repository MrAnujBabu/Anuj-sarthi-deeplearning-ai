// Streamed Chat Completions call to Lovable AI Gateway; returns the final text.
// 429/5xx get two bounded backoff retries; every other failure is terminal.
export class GatewayError extends Error {
  constructor(public status: number, message: string, public details: unknown = {}) { super(message); }
}

export async function gatewayChatText(body: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new GatewayError(401, 'AI is not configured for this app.');
  let attempt = 0;
  for (;;) {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: signal ?? null,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Lovable-AIG-SDK': 'fetch' },
      body: JSON.stringify({ ...body, stream: true }),
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      attempt++;
      const retryAfter = Number(res.headers.get('retry-after')) * 1000;
      const wait = retryAfter > 0 ? retryAfter : 1500 * 2 ** attempt + Math.random() * 500;
      await res.body?.cancel();
      await new Promise((r) => setTimeout(r, Math.min(wait, 8000)));
      continue;
    }
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => '');
      let details: unknown = t;
      try { details = JSON.parse(t); } catch { /* plain text */ }
      const d = details as { error?: { message?: string }; message?: string };
      throw new GatewayError(res.status, d?.error?.message || d?.message || `AI request failed (${res.status})`, details);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let out = '';
    let finish = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          if (j?.error) throw new GatewayError(Number(j.error.code) || 500, j.error.message || 'AI stream failed', j);
          const c = j?.choices?.[0];
          out += c?.delta?.content ?? '';
          if (c?.finish_reason) finish = c.finish_reason;
        } catch (e) {
          if (e instanceof GatewayError) throw e;
          /* partial frame */
        }
      }
    }
    if (!out.trim() && /content_filter|refusal|safety/i.test(finish)) throw new GatewayError(403, 'The model declined this request.', { finish });
    return out;
  }
}
