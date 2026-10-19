import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canonicalMemoryUrl, isDuplicateMemory } from './memory-duplicates';
import { ALL_KINDS, type MemoryKind, directImportUrl, capText } from './import-sources';
import { cleanMemoryText } from './admin-retention';

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
  kind: MemoryKind;
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
    if (!(ALL_KINDS as readonly string[]).includes(d.kind)) throw new Error("Bad kind");
    return { ...d, source_url: d.source_url ? canonicalMemoryUrl(d.source_url) : null, title: cleanMemoryText(d.title).trim().slice(0, 200), content: cleanMemoryText(d.content ?? "").slice(0, 400000) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { id, ...row } = data;
    if (!id) {
      // Skip duplicates so repeated uploads don't fill the database.
      const { data: candidates, error } = await context.supabase.from("memory_items").select("title,content,source_url");
      if (error) throw new Error(error.message);
      if (candidates?.some(candidate => isDuplicateMemory(row, candidate))) return { ok: true, duplicate: true };
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
    const started = Date.now();
    const { url, source } = directImportUrl(data.url);
    if (source === 'drive') throw new Error('Google Drive is not connected in this workspace. Connect Google Drive or download the file and upload it in PDF/Files.');
    // Linked workspace Sheets access also reads private sheets owned/shared with the connected account.
    if (source === 'sheets' && process.env['GOOGLE_SHEETS_API_KEY'] && process.env['LOVABLE_API_KEY']) {
      const sheetUrl = new URL(data.url);
      const id = sheetUrl.pathname.match(/\/spreadsheets\/d\/([\w-]+)/)?.[1];
      const headers = { Authorization: `Bearer ${process.env['LOVABLE_API_KEY']}`, 'X-Connection-Api-Key': process.env['GOOGLE_SHEETS_API_KEY'] };
      const base = `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${id}`;
      const meta = await fetch(base, { headers });
      if (!meta.ok) throw new Error(`Google Sheet read failed [${meta.status}]: ${await meta.text()}`);
      const info = await meta.json() as { properties?: { title?: string }; sheets?: { properties: { sheetId: number; title: string } }[] };
      const gid = sheetUrl.searchParams.get('gid') ?? sheetUrl.hash.match(/gid=(\d+)/)?.[1];
      const sheet = gid ? info.sheets?.find(s => String(s.properties.sheetId) === gid) : info.sheets?.[0];
      if (!sheet) throw new Error('Google Sheet tab not found.');
      const range = `'${sheet.properties.title.replace(/'/g, "''")}'`;
      const res = await fetch(`${base}/values/${range}`, { headers });
      if (!res.ok) throw new Error(`Google Sheet read failed [${res.status}]: ${await res.text()}`);
      const result = await res.json() as { values?: unknown[][] };
      const csv = (result.values ?? []).map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      if (!csv.trim()) throw new Error('Google Sheet returned no rows.');
      if (new TextEncoder().encode(csv).byteLength > 25 * 1024 * 1024) throw new Error('Google Sheet exceeds 25 MB.');
      const c = capText(csv);
      if (c.truncated) throw new Error('Google Sheet exceeds 400,000 characters; split it before bulk import to avoid partial rows.');
      return { title: info.properties?.title ?? sheet.properties.title, markdown: csv, ...c, pages: undefined as number | undefined, mime: 'text/csv', method: 'google-sheets-api', ms: Date.now() - started, csv: true };
    }
    // 1) Direct fetch: free and fast for PDFs, CSV, Google Sheets/Docs/Drive exports and text.
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'SnapSolveAdmin/1.0' } });
      const type = (res.headers.get('content-type') ?? '').toLowerCase();
      const size = Number(res.headers.get('content-length') ?? 0);
      if (size > 25 * 1024 * 1024) throw new Error('Link file 25 MB se bada hai — chhote parts mein upload karein.');
      if (res.ok && !type.includes('text/html')) {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > 25 * 1024 * 1024) throw new Error('Link file 25 MB se bada hai — chhote parts mein upload karein.');
        let text = '';
        let pages: number | undefined;
        const isPdf = type.includes('pdf') || (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46);
        if (isPdf) {
          const { extractText, getDocumentProxy } = await import('unpdf');
          const pdf = await getDocumentProxy(buf);
          const r = await extractText(pdf, { mergePages: true });
          text = r.text; pages = r.totalPages;
        } else if (/text|csv|json|xml|markdown/.test(type) || source !== 'web') {
          text = new TextDecoder().decode(buf);
        }
        if (text.trim()) {
          const c = capText(text);
          const name = decodeURIComponent(new URL(data.url).pathname.split('/').pop() || '') || data.url;
          return { title: name.slice(0, 200), markdown: c.text, truncated: c.truncated, chars: c.chars, totalChars: c.totalChars, pages, mime: isPdf ? 'application/pdf' : type.split(';')[0], method: source === 'web' ? (isPdf ? 'direct-pdf' : 'direct-text') : `google-${source}`, ms: Date.now() - started, csv: type.includes('csv') || source === 'sheets' };
        }
      } else if (!res.ok && source !== 'web') {
        throw new Error('Google file public nahi hai — "Anyone with the link" share karein ya file upload karein.');
      }
    } catch (e) {
      if (String(e).includes('25 MB') || String(e).includes('public nahi')) throw e;
    }
    // 2) Web pages: Parallel then Firecrawl through the shared reader.
    const { createAgentTools } = await import('./agent/tools.server');
    const result = await createAgentTools().read_link.execute?.({ url: data.url }, { toolCallId: 'admin-link', messages: [], context: {} });
    if (!result || !('text' in result) || typeof result.text !== 'string') throw new Error(result && 'error' in result ? String(result.error) : 'Link returned no readable text.');
    return { title: String(result.title || data.url).slice(0, 200), markdown: result.text + (result.truncated ? '\n\n[Document truncated; split large chapters into separate links.]' : ''), truncated: !!result.truncated, chars: result.text.length, totalChars: result.text.length, pages: undefined as number | undefined, mime: 'text/markdown', method: 'web-reader', ms: Date.now() - started, csv: false };
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

const MEMORY_LIMIT = "25MB";

export const getStorageLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage.getBucket("agent-memory");
    if (error) throw new Error(error.message);
    return { limited: !!data?.file_size_limit };
  });

/** Admin toggle: on = 25 MB per file, off = project-wide maximum. */
export const setStorageLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limited: boolean }) => ({ limited: d.limited === true }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.updateBucket("agent-memory", {
      public: false,
      fileSizeLimit: data.limited ? MEMORY_LIMIT : null,
    });
    if (error) throw new Error(error.message);
    return { limited: data.limited };
  });

/** Public: students only need the quiz timer and default mode, never the brain text. */
export const getQuizTimer = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("agent_settings").select("quiz_timer_seconds,default_mode").eq("id", "main").maybeSingle();
  return { seconds: data?.quiz_timer_seconds ?? 0, defaultMode: (data?.default_mode === "quiz" ? "quiz" : "solve") as "solve" | "quiz" };
});
