import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin({ supabase, userId }: Ctx) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Access denied");
}

export const amIAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: !!data };
  });

export const listMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { data, error } = await context.supabase.from("memory_items").select("*").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export type MemoryInput = {
  id?: string;
  kind: "note" | "link" | "file" | "tracker";
  title: string;
  category: string;
  subject: string;
  chapter: string;
  content: string;
  source_url?: string | null;
  file_path?: string | null;
  mime?: string | null;
  tracker_type?: "mistake" | "good_habit" | "bad_habit" | null;
  frequency?: number;
  active?: boolean;
};

export const saveMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: MemoryInput) => {
    if (!d.title?.trim()) throw new Error("Title required");
    if (!["note", "link", "file", "tracker"].includes(d.kind)) throw new Error("Bad kind");
    return { ...d, title: d.title.trim().slice(0, 200), content: (d.content ?? "").slice(0, 400000) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { id, ...row } = data;
    if (!id) {
      // Skip duplicates so repeated uploads don't fill the database.
      const dupe = row.source_url
        ? await context.supabase.from("memory_items").select("id").eq("source_url", row.source_url).limit(1)
        : await context.supabase.from("memory_items").select("id").eq("title", row.title).eq("content", row.content).limit(1);
      if (dupe.data?.length) return { ok: true, duplicate: true };
    }
    const payload = { ...row, updated_at: new Date().toISOString() };
    const q = id
      ? context.supabase.from("memory_items").update(payload).eq("id", id)
      : context.supabase.from("memory_items").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true, duplicate: false };
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; file_path?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    if (data.file_path) await context.supabase.storage.from("agent-memory").remove([data.file_path]);
    const { error } = await context.supabase.from("memory_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const readLinkForMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => {
    const u = new URL(d.url);
    if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) links");
    return { url: u.toString() };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const lovable = process.env["LOVABLE_API_KEY"];
    const key = process.env["FIRECRAWL_API_KEY"];
    if (!lovable || !key) throw new Error("Link reader not configured");
    const res = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key },
      body: JSON.stringify({ url: data.url, formats: ["markdown"], onlyMainContent: true }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Could not read link [${res.status}]: ${text.slice(0, 200)}`);
    const j = JSON.parse(text);
    const md = j.markdown ?? j.data?.markdown ?? "";
    const title = j.metadata?.title ?? j.data?.metadata?.title ?? data.url;
    return { title: String(title).slice(0, 200), markdown: String(md) };
  });

/** For PDFs and images: read the text with a vision model. */
export const extractWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string; mime: string; name: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const lovable = process.env["LOVABLE_API_KEY"];
    if (!lovable) throw new Error("AI not configured");
    const { data: blob, error } = await context.supabase.storage.from("agent-memory").download(data.path);
    if (error || !blob) throw new Error("Could not open uploaded file");
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const b64 = btoa(bin);
    const part = data.mime.startsWith("image/")
      ? { type: "image", source: { type: "base64", media_type: data.mime, data: b64 } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": lovable, "anthropic-version": "2023-06-01", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        max_tokens: 16000,
        messages: [{ role: "user", content: [
          part,
          { type: "text", text: "Transcribe all text in this document faithfully as clean markdown (keep headings, lists, tables, formulas in LaTeX). Describe diagrams briefly. Output only the content." },
        ] }],
      }),
    });
    const t = await res.text();
    if (!res.ok) throw new Error(res.status === 402 ? "AI credits khatam — text extract nahi hua, file save ho gayi." : `Extract failed [${res.status}]: ${t.slice(0, 200)}`);
    const j = JSON.parse(t);
    return { text: (j.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") };
  });

export const getAgentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { data } = await context.supabase.from("agent_settings").select("brain,quiz_timer_seconds,default_mode").eq("id", "main").maybeSingle();
    return { brain: data?.brain ?? "", quiz_timer_seconds: data?.quiz_timer_seconds ?? 0, default_mode: (data?.default_mode === "quiz" ? "quiz" : "solve") as "solve" | "quiz" };
  });

export const saveAgentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { brain: string; quiz_timer_seconds: number; default_mode?: string }) => ({
    brain: String(d.brain ?? "").slice(0, 20000),
    quiz_timer_seconds: Math.max(0, Math.min(600, Math.round(Number(d.quiz_timer_seconds) || 0))),
    default_mode: d.default_mode === "quiz" ? "quiz" : "solve",
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { error } = await context.supabase.from("agent_settings").upsert({ id: "main", ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: students only need the quiz timer and default mode, never the brain text. */
export const getQuizTimer = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("agent_settings").select("quiz_timer_seconds,default_mode").eq("id", "main").maybeSingle();
  return { seconds: data?.quiz_timer_seconds ?? 0, defaultMode: (data?.default_mode === "quiz" ? "quiz" : "solve") as "solve" | "quiz" };
});
