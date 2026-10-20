// Server-only: the answer-checking council. Three platforms, one Lovable AI key.
//   1. Evidence  — Perplexity + Parallel live web search (connector gateway)
//   2. Review    — Gemini 3.1 Pro (Google Search grounded) ‖ GPT-6 Astra (maths/logic), independent
//   3. Debate    — only when their verdicts differ: each sees the other's report and revises once
//   4. Ruling    — Claude Fable 5.1 (the tutor who wrote the answer) accepts or rejects each objection
// Nothing is stored server-side; results go back to the browser only.
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { Output, streamText } from 'ai';
import { z } from 'zod';
import { createLovableAiGatewayRunIdFetch } from '@/lib/ai/run-id';
import { classifyAiFailure, type AiFailure } from '@/lib/ai/errors';
import { GatewayError, gatewayChatText } from '@/lib/gateway-chat.server';
import {
  COUNCIL_MODELS, VERIFY_SCHEMA, councilNextStep, mergeVerdicts, splitPhotoReading, toCheck,
  type CheckResult, type CouncilEvent, type CouncilResult, type Source,
} from '@/lib/verify';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1';

export type CouncilInput = { question: string; answer: string; images: string[] };
type Ctx = { key: string; signal: AbortSignal; onFailure: (f: AiFailure) => void };

const BASE_RULES = `You are a senior NEET (India) examiner on a review council checking a tutor's answer for a NEET student.
Check every fact, definition, formula, number, unit, sign, option letter and the final answer against NCERT Class 11/12 and authoritative sources.
Rules:
- "needs_fix" ONLY for a real, material error you are confident about (wrong fact, wrong calculation, wrong option, misleading NCERT claim). Quote the exact wrong line from the answer in "line" and give the correct statement in "fix".
- "verified" when the answer is correct (minor style issues do not count).
- "unsure" when you cannot confirm with confidence.
- Never invent sources. "note" = one short plain-English sentence explaining your verdict.
Reply with JSON only: {"verdict":"verified"|"needs_fix"|"unsure","issues":[{"line":"...","fix":"..."}],"note":"..."}`;

const ROLE_FOCUS = {
  gemini: 'Your focus: factual accuracy, NCERT wording, biology/chemistry facts, exceptions, dates and names. Use Google Search to confirm anything doubtful and prefer ncert.nic.in and official sources. If a photo is attached, also check the answer read the question and options correctly.',
  openai: 'Your focus: mathematics, physics/chemistry calculations, units, significant figures, signs, logical steps and whether the chosen option follows from the working. Redo every calculation independently.',
} as const;

const checkSchema = z.object({
  verdict: z.enum(['verified', 'needs_fix', 'unsure']),
  issues: z.array(z.object({ line: z.string(), fix: z.string() })),
  note: z.string(),
});

function briefing(input: CouncilInput, evidence: string) {
  return `QUESTION FROM THE STUDENT:\n${input.question}\n\nTUTOR'S ANSWER (by ${COUNCIL_MODELS.chair.name}):\n${input.answer}\n\nLIVE WEB EVIDENCE (Perplexity + Parallel):\n${evidence}`;
}

function describe(c: CheckResult) {
  const who = COUNCIL_MODELS[c.role].name;
  const issues = c.issues.map((i, n) => `  ${n + 1}. Wrong: "${i.line}" → Correct: "${i.fix}"`).join('\n');
  return `${who} — verdict: ${c.verdict}. ${c.note}${issues ? `\n${issues}` : ''}`;
}

/** fetch wrapper: persists credit/denial signals, lets the SDK back off on 429/5xx, stops on other errors. */
function guardedFetch(ctx: Ctx, base: typeof fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await base(input, init);
    if (res.ok || res.status === 429 || res.status >= 500) return res;
    let details: unknown = {};
    try { details = await res.clone().json(); } catch { /* not JSON */ }
    const failure = classifyAiFailure(res.status, details);
    ctx.onFailure(failure);
    throw Object.assign(new Error(failure.message || `AI request failed (${res.status})`), { statusCode: res.status });
  }) as typeof fetch;
}

function failedCheck(role: CheckResult['role'], round: CheckResult['round'], e: unknown, ctx: Ctx): CheckResult {
  if (e instanceof GatewayError) ctx.onFailure(classifyAiFailure(e.status, e.details));
  const status = e instanceof GatewayError ? e.status : (e as { statusCode?: number })?.statusCode ?? 0;
  const note = status === 402 ? 'AI credits are used up.' : ctx.signal.aborted ? 'Stopped.' : 'This reviewer was unavailable.';
  if (!ctx.signal.aborted) console.error(`[council] ${role} round ${round} failed`, e instanceof Error ? e.message : e);
  return { role, round, verdict: 'unsure', issues: [], note, failed: true };
}

export async function gatherEvidence(question: string): Promise<{ evidence: string; sources: Source[] }> {
  try {
    const { createAgentTools } = await import('@/lib/agent/tools.server');
    const tools = createAgentTools({ webSearch: true }) as unknown as {
      web_search: { execute: (i: { query: string }, o: unknown) => Promise<{ results?: { title?: string; url?: string; snippet: string }[] }> };
    };
    // Search on the real question: Gemini's photo transcription first, without wrapper text, PDF bodies or boilerplate.
    const { reading, rest } = splitPhotoReading(question);
    const query = `${reading ?? ''} ${rest}`
      .replace(/<doc name="[^"]*">[\s\S]*?<\/doc>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/Solve (this|the) question[^.]*\.?/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    if (!query) return { evidence: 'No searchable question text — rely on your own knowledge and Google Search.', sources: [] };
    const r = await tools.web_search.execute({ query: `${query} NCERT NEET` }, { toolCallId: 'council', messages: [] });
    const results = (r?.results ?? []).filter((x) => x.url);
    if (!results.length) return { evidence: 'No web results — rely on your own knowledge and Google Search.', sources: [] };
    return {
      evidence: results.map((x, i) => `[${i + 1}] ${x.title ?? ''} — ${x.url}\n${x.snippet}`).join('\n\n'),
      sources: results.map((x) => ({ ...(x.title ? { title: x.title } : {}), url: x.url! })),
    };
  } catch (e) {
    console.error('[council] web evidence unavailable', e instanceof Error ? e.message : e);
    return { evidence: 'Web search unavailable — rely on your own knowledge and Google Search.', sources: [] };
  }
}

async function geminiReview(ctx: Ctx, input: CouncilInput, evidence: string, round: 1 | 2, peer?: CheckResult): Promise<CheckResult> {
  const debate = peer ? `\n\nDEBATE ROUND: another council member reported:\n${describe(peer)}\nRe-examine their points honestly. Keep your position when you are confident; change it only if their argument is correct.` : '';
  const content: unknown[] = [{ type: 'text', text: briefing(input, evidence) + debate }];
  for (const url of input.images.slice(0, 2)) content.push({ type: 'image_url', image_url: { url } });
  const messages = [{ role: 'system', content: `${BASE_RULES}\n\n${ROLE_FOCUS.gemini}` }, { role: 'user', content }];
  try {
    // Google Search grounding first; if the gateway rejects tools + schema together, fall back to strict JSON.
    try {
      const text = await gatewayChatText({ model: COUNCIL_MODELS.gemini.id, messages, tools: [{ type: 'google_search' }] }, ctx.signal);
      const check = toCheck('gemini', round, text);
      if (!check.failed) return check;
    } catch (e) {
      if (!(e instanceof GatewayError) || e.status !== 400) throw e;
    }
    const text = await gatewayChatText({
      model: COUNCIL_MODELS.gemini.id,
      messages,
      response_format: { type: 'json_schema', json_schema: { name: 'verdict', strict: true, schema: VERIFY_SCHEMA } },
    }, ctx.signal);
    return toCheck('gemini', round, text);
  } catch (e) {
    return failedCheck('gemini', round, e, ctx);
  }
}

async function openaiReview(ctx: Ctx, input: CouncilInput, evidence: string, round: 1 | 2, peer?: CheckResult): Promise<CheckResult> {
  const debate = peer ? `\n\nDEBATE ROUND: another council member reported:\n${describe(peer)}\nRe-examine their points honestly. Keep your position when you are confident; change it only if their argument is correct.` : '';
  try {
    const run = createLovableAiGatewayRunIdFetch();
    const openai = createOpenAI({
      baseURL: GATEWAY,
      apiKey: ctx.key,
      headers: { 'Lovable-API-Key': ctx.key, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
      fetch: guardedFetch(ctx, run.fetch),
    });
    const parts: ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = [{ type: 'text', text: briefing(input, evidence) + debate }];
    for (const url of input.images.slice(0, 2)) parts.push({ type: 'image', image: url });
    const result = streamText({
      model: openai.responses(COUNCIL_MODELS.openai.id),
      instructions: `${BASE_RULES}\n\n${ROLE_FOCUS.openai}`,
      messages: [{ role: 'user', content: parts }],
      output: Output.object({ schema: checkSchema }),
      maxRetries: 1,
      abortSignal: ctx.signal,
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: 'high',
          reasoningSummary: 'auto',
          include: ['reasoning.encrypted_content'],
        },
      },
    });
    return toCheck('openai', round, await result.output);
  } catch (e) {
    return failedCheck('openai', round, e, ctx);
  }
}

const CHAIR_RULES = `You are ${COUNCIL_MODELS.chair.name}, the NEET tutor who wrote the answer below, now chairing a review council with ${COUNCIL_MODELS.gemini.name} (facts, Google-grounded) and ${COUNCIL_MODELS.openai.name} (maths and logic).
They disagreed with each other or raised objections. Weigh every objection on its merits against NCERT and the evidence — accept it if it is a real error in your answer, reject it (and say why in the note) if the reviewer is wrong. Do not defend a mistake out of pride; do not accept a wrong correction to please the council.
Final verdict:
- "needs_fix": your answer has at least one real error. List ONLY accepted errors: "line" = the exact wrong line from your answer, "fix" = the corrected statement the student should learn.
- "verified": the answer stands (all objections rejected).
- "unsure": the evidence is genuinely inconclusive.
"note" = at most two short plain-English sentences telling the student what the council decided and why.
Reply with JSON only: {"verdict":"verified"|"needs_fix"|"unsure","issues":[{"line":"...","fix":"..."}],"note":"..."}`;

async function chairRuling(ctx: Ctx, input: CouncilInput, evidence: string, reports: CheckResult[]): Promise<CheckResult> {
  try {
    const run = createLovableAiGatewayRunIdFetch();
    const anthropic = createAnthropic({
      baseURL: GATEWAY,
      apiKey: ctx.key,
      headers: { 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
      fetch: guardedFetch(ctx, run.fetch),
    });
    const parts: ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = [{
      type: 'text',
      text: `${briefing(input, evidence)}\n\nCOUNCIL REPORTS (after debate):\n${reports.map(describe).join('\n\n')}`,
    }];
    for (const url of input.images.slice(0, 2)) parts.push({ type: 'image', image: url });
    let refused = false;
    const result = streamText({
      model: anthropic(COUNCIL_MODELS.chair.id),
      system: CHAIR_RULES,
      messages: [{ role: 'user', content: parts }],
      providerOptions: { anthropic: { thinking: { type: 'adaptive' }, effort: 'high' } },
      maxOutputTokens: 16000,
      maxRetries: 0,
      abortSignal: ctx.signal,
      onStepFinish: ({ rawFinishReason }) => { if (rawFinishReason === 'refusal') refused = true; },
    });
    const text = await result.text;
    if (refused) return { role: 'chair', round: 3, verdict: 'unsure', issues: [], note: 'The tutor model declined to rule on this one.', failed: true };
    return toCheck('chair', 3, text);
  } catch (e) {
    return failedCheck('chair', 3, e, ctx);
  }
}

/** Runs the council and emits progress events; the last event is "done" or "error". */
export async function runCouncil(input: CouncilInput, signal: AbortSignal, emit: (e: CouncilEvent) => void) {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) { emit({ type: 'error', message: 'AI is not configured for this app.', status: 401 }); return; }
  let credit: AiFailure | null = null;
  const ctx: Ctx = {
    key, signal,
    onFailure: (f) => {
      if (f.kind !== 'credits' || credit) return;
      credit = f;
      void import('@/lib/ai/pause.server').then(({ setAiPause }) => setAiPause(f));
    },
  };

  emit({ type: 'stage', stage: 'search' });
  const { evidence, sources } = await gatherEvidence(input.question);
  emit({ type: 'sources', sources });
  if (signal.aborted) return;

  emit({ type: 'stage', stage: 'review' });
  const checks: CheckResult[] = [];
  const record = (c: CheckResult) => { checks.push(c); emit({ type: 'check', check: c }); return c; };
  let [g, o] = await Promise.all([
    geminiReview(ctx, input, evidence, 1).then(record),
    openaiReview(ctx, input, evidence, 1).then(record),
  ]);
  if (credit) { emit({ type: 'error', message: (credit as AiFailure).message || 'AI credits are used up.', status: 402 }); return; }
  if (signal.aborted) return;

  const finish = (r: Omit<CouncilResult, 'checks' | 'sources' | 'at'>) =>
    emit({ type: 'done', result: { ...r, checks, sources, at: Date.now() } });

  let step = councilNextStep(1, g, o);
  if (step === 'debate') {
    emit({ type: 'stage', stage: 'debate' });
    const [g1, o1] = [g, o];
    [g, o] = await Promise.all([
      geminiReview(ctx, input, evidence, 2, o1).then(record),
      openaiReview(ctx, input, evidence, 2, g1).then(record),
    ]);
    if (credit) { emit({ type: 'error', message: (credit as AiFailure).message || 'AI credits are used up.', status: 402 }); return; }
    if (signal.aborted) return;
    step = councilNextStep(2, g, o);
    if (step === 'agree') {
      finish({ verdict: 'verified', issues: [], note: 'After debating, both reviewers agreed the tutor\'s answer is correct.', decidedBy: 'all-agree' });
      return;
    }
  }
  if (step === 'agree') {
    finish({ verdict: 'verified', issues: [], note: `${COUNCIL_MODELS.gemini.name} and ${COUNCIL_MODELS.openai.name} both independently confirmed the tutor's answer.`, decidedBy: 'all-agree' });
    return;
  }
  if (step === 'unavailable') {
    finish({ verdict: 'unsure', issues: [], note: 'The reviewers were unavailable — please try again in a moment.', decidedBy: 'checkers-only' });
    return;
  }

  emit({ type: 'stage', stage: 'ruling' });
  const live = [g, o].filter((c) => !c.failed);
  const ruling = record(await chairRuling(ctx, input, evidence, live));
  if (credit) { emit({ type: 'error', message: (credit as AiFailure).message || 'AI credits are used up.', status: 402 }); return; }
  if (signal.aborted) return;
  if (ruling.failed) {
    const merged = mergeVerdicts(live);
    finish({ verdict: merged, issues: live.flatMap((c) => c.issues).slice(0, 6), note: 'Reviewer findings shown — the tutor\'s ruling was unavailable.', decidedBy: 'checkers-only' });
    return;
  }
  finish({ verdict: ruling.verdict, issues: ruling.issues, note: ruling.note, decidedBy: 'ruled' });
}
