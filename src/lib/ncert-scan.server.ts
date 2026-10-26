/**
 * NCERT Deep Scan (server): Perplexity finds the chapter pages, Firecrawl reads them,
 * Gemini validates the extracted lines, and results cache in Supabase (ncert_snippets).
 * Both connectors are Lovable-managed and gateway-backed — keys stay server-side.
 */
import { chapterLabel, ncertChapter } from "./ncert-biology";
import { dedupeSnippets, extractSnippets, MAX_SNIPPETS_PER_CHAPTER, type NcertSnippet } from "./ncert-snippets";
import { COUNCIL_MODELS } from "./verify";

const CONNECTOR_GATEWAY = "https://connector-gateway.lovable.dev";

export class ScanError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function connectorKeys() {
  const lovable = process.env['LOVABLE_API_KEY'];
  const perplexity = process.env['PERPLEXITY_API_KEY'];
  const firecrawl = process.env['FIRECRAWL_API_KEY'];
  if (!lovable || !perplexity || !firecrawl) throw new ScanError(401, 'Search connectors are not configured for this app.');
  return { lovable, perplexity, firecrawl };
}

async function perplexitySearch(query: string): Promise<Array<{ title?: string; url: string }>> {
  const { lovable, perplexity } = connectorKeys();
  const res = await fetch(`${CONNECTOR_GATEWAY}/perplexity/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovable}`, 'X-Connection-Api-Key': perplexity, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, max_results: 5 }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 402) throw new ScanError(402, 'The workspace is out of Lovable credits; top up to keep scanning.');
    throw new ScanError(res.status, `Perplexity search failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const j = (await res.json()) as { results?: Array<{ title?: string; url?: string }> };
  return (j.results ?? []).filter((r): r is { title?: string; url: string } => typeof r.url === 'string' && /^https?:\/\//.test(r.url));
}

async function firecrawlMarkdown(url: string): Promise<string> {
  const { lovable, firecrawl } = connectorKeys();
  const res = await fetch(`${CONNECTOR_GATEWAY}/firecrawl/v2/scrape`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovable}`, 'X-Connection-Api-Key': firecrawl, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 402) throw new ScanError(402, 'The workspace is out of Lovable credits; top up to keep scanning.');
    throw new ScanError(res.status, `Page read failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const j = (await res.json()) as { markdown?: string; data?: { markdown?: string } };
  return (j.markdown ?? j.data?.markdown ?? '').slice(0, 60000);
}

/** Gemini checks the extracted lines against NCERT; returns indices to drop, or null when verification was unavailable. */
async function verifySnippetLines(chapter: string, snippets: NcertSnippet[]): Promise<Set<number> | null> {
  if (!snippets.length) return new Set();
  try {
    const { gatewayChatText } = await import('./gateway-chat.server');
    const list = snippets.map((s, i) => `${i}. [${s.topic}] ${s.text.slice(0, 300)}`).join('\n');
    const raw = await gatewayChatText({
      model: COUNCIL_MODELS.gemini.id,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ncert_line_check',
          schema: {
            type: 'object', additionalProperties: false, required: ['wrong'],
            properties: { wrong: { type: 'array', items: { type: 'integer' } } },
          },
        },
      },
      messages: [
        { role: 'system', content: 'You validate extracted study lines against the real NCERT textbook. Reply only with the JSON schema.' },
        { role: 'user', content: `These lines were scraped for "${chapter}". List the indices (0-based) of any line that is factually wrong for NCERT or is clearly not chapter content (navigation, ads, boilerplate). If all are fine, return an empty list.\n\n${list}` },
      ],
    });
    const m = raw.match(/\{[\s\S]*\}/);
    const j = m ? JSON.parse(m[0]) : {};
    const wrong = Array.isArray(j.wrong) ? j.wrong.filter((n: unknown) => Number.isInteger(n)) : [];
    return new Set(wrong.filter((n: number) => n >= 0 && n < snippets.length));
  } catch (e) {
    console.error('[ncert-scan] verification unavailable', e instanceof Error ? e.message : e);
    return null; // unavailable → keep lines, marked verified=false by the caller
  }
}

async function readCache(chapterKey: string): Promise<NcertSnippet[] | null> {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin
      .from('ncert_snippets')
      .select('topic,content,source_url,verified')
      .eq('chapter_key', chapterKey)
      .order('created_at', { ascending: true })
      .limit(MAX_SNIPPETS_PER_CHAPTER);
    if (error) throw error;
    if (!data?.length) return null;
    return data.map((r) => ({ topic: r.topic, text: r.content, sourceUrl: r.source_url ?? undefined, verified: r.verified }));
  } catch (e) {
    console.error('[ncert-scan] cache read failed', e instanceof Error ? e.message : e);
    return null;
  }
}

async function writeCache(chapterKey: string, snippets: NcertSnippet[]) {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const rows = snippets.map((s) => ({ chapter_key: chapterKey, topic: s.topic, content: s.text, source_url: s.sourceUrl ?? null, verified: s.verified === true }));
    const { error } = await supabaseAdmin.from('ncert_snippets').upsert(rows, { onConflict: 'chapter_key,topic' });
    if (error) throw error;
  } catch (e) {
    console.error('[ncert-scan] cache write failed', e instanceof Error ? e.message : e);
  }
}

export type ScanResult = { chapter: string; chapterKey: string; snippets: NcertSnippet[]; cached: boolean; verified: boolean };

/** Deep-scan one NCERT Biology chapter: cache → Perplexity → Firecrawl → verify → cache. */
export async function scanChapter(cls: number, no: number): Promise<ScanResult> {
  const chapter = ncertChapter(cls, no);
  if (!chapter) throw new ScanError(404, 'Unknown NCERT Biology chapter.');
  const label = chapterLabel(chapter);
  const chapterKey = `bio-${chapter.cls}-${chapter.no}`;

  const cached = await readCache(chapterKey);
  if (cached && cached.length >= 3) return { chapter: label, chapterKey, snippets: cached, cached: true, verified: cached.every((s) => s.verified) };

  const results = await perplexitySearch(`"${chapter.name}" NCERT Class ${chapter.cls} Biology chapter ${chapter.no} full text explanation`);
  // Skip whole-book index / PDF-download pages — they never carry chapter text.
  const pages = results.filter((r) => !/pdf|download|books?\b|index/i.test(r.url) && !/pdf|download/i.test(r.title ?? ''));
  if (!pages.length) throw new ScanError(422, 'No readable NCERT page found for this chapter.');

  const nameNeedle = chapter.name.toLowerCase().split(':')[0]!.trim();
  let snippets: NcertSnippet[] = [];
  const failures: string[] = [];
  for (const r of pages.slice(0, 3)) {
    try {
      const md = await firecrawlMarkdown(r.url);
      if (md.length < 500) { failures.push(`${r.url} (too short)`); continue; }
      if (!md.toLowerCase().includes(nameNeedle)) { failures.push(`${r.url} (not this chapter)`); continue; }
      snippets = dedupeSnippets([...snippets, ...extractSnippets(md).map((s) => ({ ...s, sourceUrl: r.url }))]);
      if (snippets.length >= MAX_SNIPPETS_PER_CHAPTER) break;
    } catch (e) {
      if (e instanceof ScanError && e.status === 402) throw e;
      failures.push(r.url);
    }
  }
  snippets = snippets.slice(0, MAX_SNIPPETS_PER_CHAPTER);
  if (!snippets.length) {
    throw new ScanError(422, `The chapter pages could not be read (${failures.join(', ') || 'empty results'}). Try again later — the scan never guesses content.`);
  }

  const wrong = await verifySnippetLines(label, snippets);
  const verified = wrong !== null;
  const kept = snippets.filter((_, i) => !wrong?.has(i)).map((s) => ({ ...s, verified }));
  if (!kept.length) throw new ScanError(422, 'Verification rejected all extracted lines — scan aborted instead of saving doubtful content.');

  await writeCache(chapterKey, kept);
  return { chapter: label, chapterKey, snippets: kept, cached: false, verified };
}
