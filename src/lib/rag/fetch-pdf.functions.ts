import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_BYTES = 15 * 1024 * 1024;

/** Only official NCERT hosts: the link import never becomes a general proxy. */
export function isAllowedPdfUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && /(^|\.)ncert\.nic\.in$/.test(u.hostname) && /\.pdf$/i.test(u.pathname);
  } catch { return false; }
}

/** Admin: download an NCERT PDF by link (browsers can't, CORS). Bytes go straight to the device; nothing is stored in the database. */
export const fetchNcertPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => {
    if (!isAllowedPdfUrl(String(d?.url ?? ""))) throw new Error("Sirf ncert.nic.in ke .pdf links chalenge");
    return { url: String(d.url) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: ok, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (error || !ok) throw new Error("Access denied");
    const res = await fetch(data.url, { headers: { "User-Agent": "Mozilla/5.0 SnapSolve" } });
    if (!res.ok) throw new Error(`NCERT site ne PDF nahi diya [${res.status}]`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new Error("PDF 15 MB se bada hai");
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { base64: btoa(bin), name: data.url.split("/").pop() ?? "ncert.pdf" };
  });
