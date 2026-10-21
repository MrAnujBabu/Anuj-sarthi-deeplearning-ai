import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMBED_MODEL = "google/gemini-embedding-2";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
const MAX_BATCH = 100; // provider cap for gemini-embedding-*
const MAX_INPUT_CHARS = 6000; // stays well under the 8192-token ceiling

type Ctx = { supabase: any; userId: string };

async function assertAdmin({ supabase, userId }: Ctx) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Access denied");
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this workspace.");
  let attempt = 0;
  while (true) {
    attempt += 1;
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    });
    if (res.ok) {
      const data = await res.json();
      const rows = (data.data ?? []) as { index: number; embedding: number[] }[];
      return rows.sort((a, b) => a.index - b.index).map((r) => r.embedding);
    }
    // 429/5xx: one bounded retry; everything else is terminal.
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    if (res.status === 402) throw new Error("AI credits khatam ho gaye — top-up ke baad dobara try karo.");
    if (res.status === 403) throw new Error("Embedding model access blocked hai — workspace settings check karo.");
    throw new Error(`Embedding failed [${res.status}]`);
  }
}

/** Bulk embed for the admin NCERT import (admin only). */
export const embedTexts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { texts: string[] }) => {
    if (!Array.isArray(d?.texts) || !d.texts.length) throw new Error("No text to embed");
    if (d.texts.length > MAX_BATCH) throw new Error(`Max ${MAX_BATCH} chunks per batch`);
    return { texts: d.texts.map((t) => String(t).slice(0, MAX_INPUT_CHARS)) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    return { vectors: await embedBatch(data.texts) };
  });

/** Single-query embed for chat-time retrieval (any signed-in student). */
export const embedQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => {
    if (!d?.text?.trim()) throw new Error("No query text");
    return { text: String(d.text).slice(0, MAX_INPUT_CHARS) };
  })
  .handler(async ({ data }) => {
    const [vector] = await embedBatch([data.text]);
    return { vector };
  });
