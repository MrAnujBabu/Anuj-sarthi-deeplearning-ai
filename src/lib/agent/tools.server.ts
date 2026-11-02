import { tool } from "ai";
import { z } from "zod";
import { isNcertUrl, MAX_TOOL_CALLS, NCERT_BOOKS, bookKey, textbookUrl, trim } from "./ncert";
import { earlyFallback } from "./fallback";

const GW = "https://connector-gateway.lovable.dev";

// Per-provider cap so one slow service never stalls the answer (the gateway itself allows ~60s).
const SEARCH_TIMEOUT_MS = 8000;
const EXTRACT_TIMEOUT_MS = 15000;
const PDF_EXTRACT_TIMEOUT_MS = 25000;
const SCRAPE_TIMEOUT_MS = 20000;

async function gw(connector: string, keyName: string, path: string, body: unknown, timeoutMs = 15000) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const key = process.env[keyName];
  if (!lovable || !key) throw new Error(`${connector} not configured`);
  const res = await fetch(`${GW}/${connector}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`${connector} failed [${res.status}]: ${t}`);
    throw new Error(`${connector} failed [${res.status}]`);
  }
  return res.json() as Promise<any>;
}

/** Tools for one request; a shared counter caps paid calls per answer. */
export function createAgentTools(opts?: { webSearch?: boolean }) {
  let calls = 0;
  const guard = () => {
    calls += 1;
    if (calls > MAX_TOOL_CALLS) throw new Error("Tool budget used up — answer with what you have.");
  };

  const webSearchTool = tool({
    description:
      "Search the live web for real, current information (news, facts, dates, stats, anything beyond NCERT). Only available when the student turned Search on. Returns titled results with links and snippets — cite the links you use.",
    inputSchema: z.object({
      query: z.string().describe("Short search keywords, e.g. 'NEET 2027 exam date NTA'"),
    }),
    execute: async ({ query }) => {
      guard();
      const seen = new Set<string>();
      const results: { title?: string; url?: string; snippet: string }[] = [];
      const push = (r: any) => {
        const url = r?.url;
        if (!url || seen.has(url)) return;
        seen.add(url);
        results.push({ title: r.title, url, snippet: trim(r.snippet ?? (r.excerpts ?? []).join(" … "), 500) });
      };
      const [ppx, par] = await Promise.allSettled([
        gw("perplexity", "PERPLEXITY_API_KEY", "/search", { query, max_results: 5 }, SEARCH_TIMEOUT_MS),
        gw("parallel", "PARALLEL_API_KEY", "/v1/search", {
          objective: `Find accurate, current information for: ${query}`,
          search_queries: [query.slice(0, 190)],
          mode: "fast",
          advanced_settings: { max_results: 5, excerpt_settings: { max_chars_per_result: 600 } },
        }, SEARCH_TIMEOUT_MS),
      ]);
      if (ppx.status === "fulfilled") (ppx.value.results ?? []).forEach(push);
      if (par.status === "fulfilled") (par.value.results ?? []).forEach(push);
      if (!results.length) return { results: [], error: "Web search returned nothing — answer from your own knowledge." };
      return { results: results.slice(0, 8) };
    },
  });

  return {
    ...(opts?.webSearch ? { web_search: webSearchTool } : {}),
    ncert_search: tool({
      description:
        "Search the official NCERT Class 11/12 textbooks (ncert.nic.in) for the chapter and exact lines covering a concept. Call this first for every new question.",
      inputSchema: z.object({
        query: z.string().describe("Short keywords, e.g. 'Newton second law momentum'"),
        classNum: z.number().describe("11 or 12"),
        subject: z.string().describe("physics, chemistry or biology"),
      }),
      execute: async ({ query, classNum, subject }) => {
        guard();
        const book = NCERT_BOOKS[bookKey(classNum, subject)];
        try {
          const data = await gw("parallel", "PARALLEL_API_KEY", "/v1/search", {
            objective: `Find the NCERT ${book?.label ?? ""} textbook section explaining: ${query}`,
            search_queries: [`NCERT class ${classNum} ${subject} ${query}`.slice(0, 190)],
            mode: "fast",
            advanced_settings: {
              max_results: 4,
              source_policy: { include_domains: ["ncert.nic.in"] },
              excerpt_settings: { max_chars_per_result: 900 },
            },
          }, SEARCH_TIMEOUT_MS);
          const results = (data.results ?? []).map((r: any) => ({
            title: r.title,
            url: r.url,
            excerpt: trim((r.excerpts ?? []).join(" … "), 900),
          }));
          return { book: book?.label, bookUrl: textbookUrl(classNum, subject), results };
        } catch (e) {
          return { book: book?.label, bookUrl: textbookUrl(classNum, subject), results: [], error: String(e) };
        }
      },
    }),

    ncert_read: tool({
      description: "Read the text of one ncert.nic.in page or chapter PDF found by ncert_search, to quote NCERT exactly.",
      inputSchema: z.object({
        url: z.string(),
        focus: z.string().describe("What to look for in the page"),
      }),
      execute: async ({ url, focus }) => {
        if (!isNcertUrl(url)) return { error: "Only ncert.nic.in pages can be read." };
        guard();
        const parallelExtract = async (): Promise<{ url: string; title?: string; text?: string; error?: string }> => {
          try {
            const data = await gw("parallel", "PARALLEL_API_KEY", "/v1/extract", {
              urls: [url],
              objective: focus,
              advanced_settings: { excerpt_settings: { max_chars_per_result: 3000 } },
            }, PDF_EXTRACT_TIMEOUT_MS);
            const r = data.results?.[0];
            if (r) return { url, title: r.title, text: trim((r.excerpts ?? []).join("\n…\n")) };
          } catch {
            /* fall through to Firecrawl */
          }
          return { url, text: "", error: "No readable text found on this page." };
        };
        const firecrawlScrape = async (): Promise<{ url: string; title?: string; text?: string; error?: string }> => {
          try {
            const data = await gw("firecrawl", "FIRECRAWL_API_KEY", "/v2/scrape", {
              url,
              formats: ["markdown"],
              onlyMainContent: true,
            }, SCRAPE_TIMEOUT_MS);
            const md = data.markdown ?? data.data?.markdown ?? "";
            return { url, text: trim(md) };
          } catch (e) {
            return { url, error: String(e) };
          }
        };
        // Parallel extracts faster; if it is slow, Firecrawl starts too and the first usable text wins.
        return earlyFallback(parallelExtract(), firecrawlScrape, 4000, (r) => !!r.text);
      },
    }),

    read_link: tool({
      description:
        "Read a web page or PDF link the STUDENT pasted (their notes, a chapter PDF, an article) so you can teach or quiz from it. Only for links the student gave.",
      inputSchema: z.object({ url: z.string() }),
      execute: async ({ url }) => {
        if (!/^https?:\/\//i.test(url)) return { error: "Not a web link." };
        guard();
        const parallelRead = async (): Promise<{ url: string; title?: string; text?: string; truncated?: boolean; error?: string }> => {
          try {
            const data = await gw("parallel", "PARALLEL_API_KEY", "/v1/extract", {
              urls: [url],
              objective: "Read the student's document, preserving questions, options, answer keys and page references.",
              advanced_settings: { full_content: true, excerpt_settings: { max_chars_per_result: 12000 } },
            }, EXTRACT_TIMEOUT_MS);
            const result = data.results?.[0];
            const text = result?.full_content || (result?.excerpts ?? []).join("\n");
            if (text?.trim()) return { url, title: result.title, text: trim(text, 12000), truncated: text.length > 12000 };
          } catch { /* Fall back to the existing reader. */ }
          return { url, text: "", error: "This link returned no readable text. Upload the PDF instead; do not guess its contents." };
        };
        const firecrawlRead = async (): Promise<{ url: string; title?: string; text?: string; truncated?: boolean; error?: string }> => {
          try {
            const data = await gw("firecrawl", "FIRECRAWL_API_KEY", "/v2/scrape", {
              url,
              formats: ["markdown"],
              onlyMainContent: true,
            }, SCRAPE_TIMEOUT_MS);
            const md = data.markdown ?? data.data?.markdown ?? "";
            const title = data.metadata?.title ?? data.data?.metadata?.title;
            if (!md.trim()) return { url, error: "This link returned no readable text. Upload the PDF instead; do not guess its contents." };
            return { url, title, text: trim(md, 12000), truncated: md.length > 12000 };
          } catch (e) {
            return { url, error: String(e) };
          }
        };
        // Public PDF extraction is faster via Parallel; if it is slow, Firecrawl starts too and the first usable text wins.
        return earlyFallback(parallelRead(), firecrawlRead, 4000, (r) => !!r.text);
      },
    }),

    neet_pyq_search: tool({
      description: "Find NEET previous-year questions and exam trends on a topic. Use once at most, only for new questions.",
      inputSchema: z.object({ topic: z.string() }),
      execute: async ({ topic }) => {
        guard();
        try {
          const data = await gw("perplexity", "PERPLEXITY_API_KEY", "/search", {
            query: `NEET previous year questions ${topic}`,
            max_results: 4,
          }, SEARCH_TIMEOUT_MS);
          return {
            results: (data.results ?? []).map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: trim(r.snippet ?? "", 500),
            })),
          };
        } catch (e) {
          return { results: [], error: String(e) };
        }
      },
    }),
  };
}
