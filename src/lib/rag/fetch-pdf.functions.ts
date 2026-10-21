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
    const name = data.url.split("/").pop() ?? "ncert.pdf";
    try {
      const res = await fetch(data.url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36", Referer: "https://ncert.nic.in/textbook.php", Accept: "application/pdf,*/*" } });
      if (!res.ok) throw new Error(`NCERT [${res.status}]`);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) throw new Error("PDF 15 MB se bada hai");
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return { base64: btoa(bin), name, text: "" };
    } catch {
      // NCERT often blocks non-Indian servers: read the PDF through Firecrawl (India location) instead.
      return { base64: "", name, text: await firecrawlPdfText(data.url) };
    }
  });

/** Firecrawl separates PDF pages with "---"; turn them into [Page N] markers for the chunker. */
export function pagesFromFirecrawl(md: string): string {
  return md.split(/\n-{3,}\n/).map((t, i) => `[Page ${i + 1}]\n${t.trim()}`).join("\n\n");
}

async function firecrawlPdfText(url: string): Promise<string> {
  const lovable = process.env["LOVABLE_API_KEY"], fc = process.env["FIRECRAWL_API_KEY"];
  if (!lovable || !fc) throw new Error("PDF reader configured nahi hai");
  const res = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": fc, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], parsers: ["pdf"], location: { country: "IN" } }),
  });
  if (!res.ok) throw new Error(`PDF read nahi hua [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { data?: { markdown?: string }; markdown?: string };
  const md = json.data?.markdown ?? json.markdown ?? "";
  if (md.trim().length < 200) throw new Error("PDF me padhne layak text nahi mila");
  return pagesFromFirecrawl(md);
}
