import { createAnthropic } from "@ai-sdk/anthropic";
import { stepCountIs, streamText, tool, type ModelMessage } from "ai";
import process from "node:process";
import { z } from "zod";
import { createAgentTools } from "@/lib/agent/tools.server";
import { validVoiceAnswer, voiceQuizOptions, VOICE_SKIP } from "@/lib/voice-quiz";
import { createVoiceTracking } from '@/lib/voice-tracking.server';
import { confirmedSeconds, documentMetadata, type VoiceDocument } from '@/lib/voice-usage';
import { VOICE_TUTOR_MODEL, CLAUDE_OUTPUT_BUDGET } from '@/lib/models';
import { cleanTranscript, isNoiseOnly } from "@/lib/noise-filter";
import { classifyAiFailure, encodeAiFailure } from '@/lib/ai/errors';
import { getAiPause, setAiPause } from '@/lib/ai/pause.server';
import { VERCEL_APP_ORIGIN } from '@/lib/live-endpoint';
import { createNcertDeck, ncertDeckPrompt } from "@/lib/ncert-biology-bank";
import { paceInstruction, paceUpdate, voiceSpeed, type VoiceSpeed } from "@/lib/voice-speed";
import { voiceChatText } from "@/lib/voice-chat";

export type CallPrefs = { voice: string; accent: "indian" | "neutral"; quiz: boolean; matchQ: boolean; assertionQ: boolean; deep: boolean; search: boolean; context: string; documents: VoiceDocument[]; speed: VoiceSpeed };
const VOICES = new Set(["marin", "meridian", "gleam", "vesper", "willow"]);
export function parseCallPrefs(raw: unknown): CallPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<"voice" | "accent" | "quiz" | "matchQ" | "assertionQ" | "deep" | "search" | "context" | "documents" | "speed", unknown>>;
  return {
    voice: typeof r.voice === "string" && VOICES.has(r.voice) ? r.voice : "marin",
    accent: r.accent === "neutral" ? "neutral" : "indian",
    quiz: r.quiz === true,
    matchQ: r.matchQ === true,
    assertionQ: r.assertionQ === true,
    deep: r.deep === true,
    search: r.search === true,
    context: typeof r.context === "string" ? r.context.slice(0, 40_000) : "",
    documents: documentMetadata(r.documents),
    speed: voiceSpeed(r.speed) ?? 1,
  };
}

/** Extra quiz-question styles chosen in voice settings (Match the Following, Assertion–Reason, deep NCERT). */
export function quizStyle(prefs: Pick<CallPrefs, "matchQ" | "assertionQ" | "deep">): string {
  const parts: string[] = [];
  const types = [prefs.matchQ && "Match the Following", prefs.assertionQ && "Assertion–Reason"].filter(Boolean);
  if (types.length) parts.push(` Ask ONLY these NEET question types${types.length > 1 ? ", alternating" : ""}: ${types.join(" and ")}. Never ask a plain one-line MCQ while these are on, including the first question.`);
  if (prefs.matchQ) parts.push(" Match the Following: write Column I items as a., b., c., d. and Column II as i., ii., iii., iv. on separate short lines, then options like (A) a-iii, b-i, c-iv, d-ii.");
  if (prefs.assertionQ) parts.push(" Assertion–Reason: write 'Assertion (A): …' and 'Reason (R): …' on separate lines, then (A) Both true, R explains A (B) Both true, R does not explain A (C) A true, R false (D) A false, R true.");
  if (prefs.deep) parts.push(" DEEP MODE: make hard, NEET-advanced questions built strictly from NCERT Class 11/12 Biology lines (exceptions, examples, diagrams, tables) and from any student-attached material; use multi-concept reasoning, never trivia outside NCERT; when grading, cite the NCERT chapter. Before each question say its chapter line exactly as given (NCERT Class, Chapter number and official chapter name); never rename a chapter.");
  return parts.join("");
}

function callInstructions(prefs: CallPrefs) {
  const extra: string[] = [
    "Audio: Speak clearly at a steady pace. Ignore background noise, whispers, TV or other people's voices; respond only to the student's clear speech. If speech is unclear, briefly ask them to repeat instead of guessing.",
  ];
  if (prefs.accent === "indian")
    extra.push("Accent: Speak with a natural Indian English accent and Indian pronunciation, like a friendly Indian teacher; never an American accent.");
  if (prefs.speed !== 1) extra.push(paceInstruction(prefs.speed));
  if (prefs.quiz)
    extra.push("Quiz mode is ON: delegate to the backend to get one NEET MCQ at a time, read the question and options A-D aloud, wait for the student's spoken answer, then delegate again to check it and continue." + quizStyle(prefs));
  if (prefs.search) extra.push("Live search is ON: the backend can look up current information on the web.");
  if (prefs.context) extra.push("The student attached study material or a previous conversation; the backend has it. Delegate questions about it.");
  return [conversationInstructions, ...extra].join("\n");
}

export type LiveConfig = {
  baseURL: string;
  key: string;
  liveModel: string;
  backendModel: string;
  openingInstructions?: string;
};

// Fill from co-loaded knowledge: the gateway URL, the Live model and the resolved chat model.
const liveSettings = {
  baseURL: "https://ai.gateway.lovable.dev/v1",
  liveModel: "openai/gpt-live-1",
  backendModel: VOICE_TUTOR_MODEL,
};

export type LiveSocket = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: unknown) => void): void;
  onClose(handler: () => void): void;
  onError(handler: () => void): void;
};

export type LiveExecutionContext = { waitUntil(task: Promise<unknown>): void };
export type LiveConnector = (url: string, headers: Record<string, string>, signal: AbortSignal) => Promise<LiveSocket>;

type WorkerSocket = WebSocket & { accept(): void };
declare const WebSocketPair: { new (): { 0: WorkerSocket; 1: WorkerSocket } };
type Transcript = {
  role: "user" | "assistant";
  text: string;
  start_ms: number;
  end_ms: number;
  listeningSound: boolean;
};
type ProviderEvent = {
  type: string;
  client_event_id?: string;
  error?: { client_event_id?: string; message?: string };
  session?: { id: string };
  delta?: string;
  start_ms?: number;
  end_ms?: number;
  offset_ms?: number;
  delegation?: { id: string; target: string };
  usage?: { seconds?: unknown };
  reason?: string;
};

export function getLiveConfig(): LiveConfig {
  const config: LiveConfig = {
    ...liveSettings,
    key: process.env["LOVABLE_API_KEY"] ?? "",
  };
  if ([config.baseURL, config.key, config.liveModel, config.backendModel].some((value) => !value)) {
    throw new Error("Missing Live relay configuration");
  }
  return config;
}

function gatewayAPIBase(baseURL: string) {
  return `${baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`;
}

/** Workspace pause, then the model's own pause — read together so call start and answers never wait twice. */
async function currentPause(model: string) {
  const [workspace, modelPause] = await Promise.all([getAiPause(), getAiPause(model)]);
  return workspace ?? modelPause;
}

async function gatewayRejection(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.slice(0, 300) : "";
  return new Error(message || `Voice gateway rejected the connection (${response.status})`);
}

export function validateLiveUpgrade(request: Request, options: { allowMissingOrigin?: boolean } = {}): Response | null {
  const origin = request.headers.get("origin");
  if (origin === null ? !options.allowMissingOrigin : origin !== new URL(request.url).origin && origin !== VERCEL_APP_ORIGIN) {
    return new Response("Voice connection origin rejected", { status: 403 });
  }
  if (request.method !== "GET" || request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("WebSocket required", { status: 426 });
  }
  return null;
}

function workerSocket(socket: WorkerSocket): LiveSocket {
  return {
    get readyState() {
      return socket.readyState;
    },
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (handler) => socket.addEventListener("message", (event) => handler(event.data)),
    onClose: (handler) => socket.addEventListener("close", handler),
    onError: (handler) => socket.addEventListener("error", handler),
  };
}

export function handleLiveRequest(request: Request): Response {
  const waitUntil = (request as Request & Partial<LiveExecutionContext>).waitUntil;
  if (!waitUntil) return new Response("Live runtime unavailable", { status: 503 });
  const config = getLiveConfig();
  const rejected = validateLiveUpgrade(request);
  if (rejected) return rejected;
  const pair = new WebSocketPair();
  pair[1].accept();
  bindLiveConnection(workerSocket(pair[1]), config, { waitUntil }, async (url, headers, signal) => {
    const response = await fetch(url, { headers: { ...headers, Upgrade: "websocket" }, signal });
    const socket = (response as Response & { webSocket?: WorkerSocket | null }).webSocket;
    if (!socket) throw await gatewayRejection(response);
    socket.accept();
    return workerSocket(socket);
  });
  const response: ResponseInit & { webSocket: WebSocket } = { status: 101, webSocket: pair[0] };
  return new Response(null, response);
}

const conversationInstructions = `You are SnapSolve, a warm NEET 2027 tutor for an Indian student.
Language: Speak natural Hinglish (Hindi + English mix, Roman-style Indian accent). If the student speaks pure English or pure Hindi, match them.
Speak in short, clear spoken sentences. Never read out formulas symbol by symbol; say them the way a teacher explains aloud.
Structure: For answers with multiple points, speak them as a numbered sequence ("Pehla …, doosra …, teesra …") so the on-screen transcript shows a clean numbered list; for comparisons, speak them as "Column I … Column II …" pairs so the transcript shows a table; for a longer deep-dive, start it with "Detail mein: …" so the transcript shows it as a collapsible toggle the student can open when revising.
Backchannel policy: Use light listening sounds without taking over.
Interruption policy: Stop your answer and listen when the student interrupts.
Delegation policy:
Backend tools: A careful NEET tutor (Physics, Chemistry, Biology from NCERT) that also plans study schedules.
Delegate to the backend when: The student asks any concept, doubt, numerical, MCQ, NCERT fact, revision or study-plan question,
or a correction changes a question already being worked on.
Do not delegate to the backend when: Greeting, small talk, clarifying the question, or repeating a still-current answer.
Wait for the backend result before presenting its answer, then explain it conversationally.`;

const studyScheduleInput = z
  .object({
    total_minutes: z.number().int().min(1).max(10_080),
    days: z.number().int().min(1).max(30),
  })
  .strict();

function planStudySchedule(args: z.infer<typeof studyScheduleInput>) {
  const daily = Math.floor(args.total_minutes / args.days);
  return {
    total_minutes: args.total_minutes,
    days: args.days,
    sessions: Array.from({ length: args.days }, (_, index) => ({
      day: index + 1,
      minutes: daily + (index < args.total_minutes % args.days ? 1 : 0),
    })),
  };
}

function isListeningSound(text: string) {
  const normalized = text.toLowerCase().replace(/[\s\p{Pd}]/gu, "");
  return /^(?:m+hm+|uhhuh)[.,!]*$/.test(normalized);
}

// Claude rejects conversations ending on an assistant turn (no prefill); the
// spoken transcript often ends with the voice agent's own words.
export function endWithUserTurn(messages: ModelMessage[]): ModelMessage[] {
  const copy = [...messages];
  const last = copy.at(-1);
  if (!last || last.role === "assistant") {
    copy.push({ role: "user", content: "(Answer the student's latest spoken question above.)" });
  }
  return copy;
}

export async function answerQuestion(
  messages: ModelMessage[],
  config: LiveConfig,
  correlation: { runID: string; sessionID: string | undefined; delegationID: string },
  signal: AbortSignal,
  consumeInput: () => void,
  onPlan: (plan: ReturnType<typeof planStudySchedule>) => void,
  prefs: CallPrefs = parseCallPrefs(null),
  onSearch: () => void = () => {},
  ncertPrompt = "",
) {
  signal.throwIfAborted();
  const paused = await currentPause(config.backendModel);
  if (paused) throw new Error(paused.message);
  const provider = createAnthropic({
    baseURL: gatewayAPIBase(config.baseURL),
    apiKey: config.key,
    headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      if (!response.ok) {
        const details: unknown = await response.clone().json().catch(() => ({}));
        const failure = classifyAiFailure(response.status, details);
        if (failure.kind === 'credits') await setAiPause(failure);
        if (failure.kind === 'denied' && !/provider_not_available_in_region|model_requires_retention_consent|model_vendor_not_enabled/.test(JSON.stringify(details))) await setAiPause(failure, config.backendModel);
        throw new Error(encodeAiFailure(failure));
      }
      return response;
    },
  });
  let responseCursor = 0;
  consumeInput();
  const result = streamText({
    model: provider(config.backendModel),
    maxOutputTokens: CLAUDE_OUTPUT_BUDGET,
    abortSignal: signal,
    maxRetries: 0,
    stopWhen: stepCountIs(50),
    includeRawChunks: true,
    prepareStep() {
      consumeInput();
      return { messages: endWithUserTurn(messages) };
    },
    onStepFinish(step) {
      for (const call of step.toolCalls) if (call?.toolName === 'web_search') onSearch();
      messages.push(...step.response.messages.slice(responseCursor));
      responseCursor = step.response.messages.length;
    },
    headers: {
      "X-Lovable-AIG-Run-ID": correlation.runID,
      "X-Lovable-AIG-Metadata": JSON.stringify({
        live_session_id: correlation.sessionID,
        delegation_id: correlation.delegationID,
      }),
    },
    providerOptions: {
      // Bank questions only need copying and grading against a known key: answer quickly.
      anthropic: { thinking: { type: "adaptive" }, effort: ncertPrompt ? "medium" : "high" },
    },
    system:
      "Help a spoken NEET 2027 tutor answer the latest student question (Physics, Chemistry, Biology; follow NCERT). " +
      "Reply in the student's language (Hinglish by default), written for speaking aloud: no tables, no LaTeX, no markdown. " +
      "When listing multiple points, phrase them as 'Pehla …, doosra …, teesra …' so they can be shown as a numbered list. " +
      "For a longer deep-dive, start it with 'Detail mein: …' so it can be shown as a collapsible section. " +
      "Transcripts may be incomplete or corrected. Use the latest correction. " +
      "Continue from completed tool results; do not repeat completed actions. " +
      "Return verified facts and useful next steps in at most 150 words. " +
      "To display a study schedule for the current request, call plan_study_schedule with its total minutes and days. " +
      "Ask for missing details instead of guessing. The tool only calculates a draft plan; " +
      "it does not save calendar events." +
      (prefs.quiz ? " QUIZ MODE: give exactly one NEET question with options labelled (A) (B) (C) (D), each on its own line (convert (1)-(4) numbering to A-D), no answer or check the student's spoken answer briefly and give the next question. When checking an answer, first say the verdict and 'Sahi jawab (X) hai — <option text>' in one sentence, then 'Detail mein: …' with a two or three sentence NCERT-based explanation (from the attached material when there is any), then the next question." : "") +
      (prefs.quiz ? quizStyle(prefs) : "") +
      ncertPrompt +
      (prefs.search ? " Use web_search for current facts when needed." : "") +
      (prefs.context ? `\n\nStudent-attached material (use it when relevant):\n${prefs.context}` : ""),
    messages: endWithUserTurn(messages),
    tools: {
      ...(prefs.search ? { web_search: createAgentTools({ webSearch: true }).web_search } : {}),
      plan_study_schedule: tool({
        description: "Distribute a total study time evenly across days and return a draft schedule.",
        inputSchema: studyScheduleInput,
        execute: async (args) => {
          signal.throwIfAborted();
          const plan = planStudySchedule(args);
          onPlan(plan);
          return plan;
        },
      }),
    },
  });
  let completed = false;
  let stepCompleted = false;
  let failed = false;
  // Drain through HTTP EOF so successful work is not recorded as cancelled by the Gateway.
  for await (const part of result.fullStream) {
    if (part.type === "start-step") stepCompleted = false;
    if (part.type === "raw" && part.rawValue && typeof part.rawValue === "object" && "type" in part.rawValue) {
      if (part.rawValue.type === "response.completed") stepCompleted = true;
      if (part.rawValue.type === "response.failed" || part.rawValue.type === "response.incomplete") failed = true;
    }
    if (part.type === "finish-step") stepCompleted = true;
    if (part.type === "error") throw part.error;
    if (part.type === "abort") failed = true;
    if (part.type === 'finish-step' && part.rawFinishReason === 'refusal') throw new Error('The model declined this request. This request has stopped.');
    if (part.type === "finish") completed = part.finishReason === "stop" && stepCompleted;
  }
  signal.throwIfAborted();
  if (failed || !completed) throw new Error("The backend response did not complete");
  const answer = await result.text;
  if (!answer.trim()) throw new Error("The backend response had no answer");
  return answer;
}

function* commentaryChunks(content: string) {
  const encoder = new TextEncoder();
  let chunk = "";
  let bytes = 0;
  for (const [word] of content.matchAll(/\S+\s*|\s+/gu)) {
    // Chunks stay well inside the provider's per-append size limit.
    if (chunk && bytes + encoder.encode(word).length > 480) {
      yield chunk;
      chunk = "";
      bytes = 0;
    }
    for (const character of word) {
      const size = encoder.encode(character).length;
      if (bytes + size > 480) {
        yield chunk;
        chunk = "";
        bytes = 0;
      }
      chunk += character;
      bytes += size;
    }
  }
  if (chunk) yield chunk;
}

export function bindLiveConnection(
  browser: LiveSocket,
  configuration: LiveConfig,
  execution: LiveExecutionContext,
  connect: LiveConnector,
): void {
  const config = { ...configuration };
  const runID = crypto.randomUUID();
  const track = createVoiceTracking(runID, (promise) => execution.waitUntil(promise), () => emit({ type: 'app.history.error', error: { message: 'Call history could not be saved.' } }));
  let tracked = false;
  let finalUsage = false;
  let usageSeconds: number | null = null;
  let answerCount = 0;
  let searchCount = 0;
  let lastError: string | null = null;
  const setupAbort = new AbortController();
  let gateway: LiveSocket | undefined;
  let sessionID: string | undefined;
  let starting = false;
  let closing = false;
  let finished = false;
  let revision = 0;
  let task: AbortController | undefined;
  const pendingDelegations: Array<{
    event: ProviderEvent;
    plan?: ReturnType<typeof planStudySchedule>;
  }> = [];
  let completedDelegation: (typeof pendingDelegations)[number] | undefined;
  const backendMessages: ModelMessage[] = [];
  let prefs = parseCallPrefs(null);
  let ncertDeck: ReturnType<typeof createNcertDeck> | undefined;
  let openQuiz: { id: string; answered: boolean } | undefined;
  const typedAnswers = new Set<string>();
  let transcriptCursor = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let finishDrain: (() => void) | undefined;
  let browserReady = false;
  let greetingRequested = false;
  let greetingCommand: { id: string; type: "commentary" } | undefined;
  // Faster startup: the browser may send app.prepare as soon as its socket opens,
  // so the pause check and the Gateway connection run while it still gathers ICE.
  let prepared = false;
  let warm: Promise<{ socket: LiveSocket; alive: () => boolean } | undefined> | undefined;
  let pauseCheck: ReturnType<typeof currentPause> | undefined;
  let startedSpeed: VoiceSpeed = 1;
  let greetingTimer: ReturnType<typeof setTimeout> | undefined;
  // Only real transcript activity extends provider inactivity. A connected,
  // silent student gets a short spoken check-in; never manufacture heartbeats.
  const IDLE_CHECKIN_MS = 70_000;
  let lastTranscriptAt = Date.now();
  let lastBrowserHeartbeatAt = 0;
  let lastCheckinAt = 0;
  const idleTimer = setInterval(() => {
    if (closing || !browserReady || !sessionID || task || greetingCommand) return;
    if (gateway?.readyState !== 1) return;
    if (Date.now() - lastBrowserHeartbeatAt >= 5000) return;
    if (Date.now() - lastTranscriptAt < IDLE_CHECKIN_MS) return;
    if (Date.now() - lastCheckinAt < IDLE_CHECKIN_MS) return;
    lastCheckinAt = Date.now();
    try {
      gateway.send(
        JSON.stringify({
          type: "session.commentary.append",
          event_id: crypto.randomUUID(),
          delegation_id: null,
          content:
            "Main yahin hoon. Jab taiyaar ho, apna agla sawaal bolo.",
        }),
      );
    } catch {
      /* the gateway close path handles a broken socket */
    }
  }, 5000);
  const startupMessageTimeout = () => {
    emit({ type: "app.error", error: { message: "Voice startup message timed out" } });
    stop();
  };
  let startTimer = setTimeout(startupMessageTimeout, 5000);
  const transcripts: Transcript[] = [];
  const delegations = new Set<string>();

  function emit(event: object) {
    if (browser.readyState !== 1) return;
    try {
      browser.send(JSON.stringify(event));
    } catch {
      stop();
    }
  }

  function close(socket?: LiveSocket) {
    if (!socket || socket.readyState === 3) return;
    try {
      socket.close(1000, "Call ended");
    } catch {
      return;
    }
  }

  function clearGreeting() {
    clearTimeout(greetingTimer);
    greetingCommand = undefined;
  }

  function openingInstructions() {
    return (
      config.openingInstructions ??
      "When you are told to begin: greet the student briefly in Hinglish as their NEET tutor and ask which doubt or topic they want to discuss today, then listen."
    ).trim();
  }

  // The opening rule already travels in session.start, so once media is ready a
  // single commentary starts the greeting — no extra round trip before speaking.
  function requestGreeting() {
    if (!openingInstructions() || !browserReady || !sessionID || greetingRequested || closing) return;
    greetingRequested = true;
    greetingCommand = { id: crypto.randomUUID(), type: "commentary" };
    greetingTimer = setTimeout(() => {
      clearGreeting();
      emit({ type: "app.greeting.error", error: { message: "The opening could not be confirmed" } });
    }, 10_000);
    gateway?.send(
      JSON.stringify({
        type: "session.commentary.append",
        event_id: greetingCommand.id,
        delegation_id: null,
        content: "Begin the conversation now, following the instructions provided.",
      }),
    );
  }

  function gatewayTarget() {
    return {
      url: new URL(`${gatewayAPIBase(config.baseURL)}/live/sessions`).href,
      headers: {
        "Lovable-API-Key": config.key,
        "X-Lovable-AIG-SDK": "fetch",
        "X-Lovable-AIG-Run-ID": runID,
      },
    };
  }

  // Open the Gateway control socket early. No session exists (and nothing is
  // billed) until session.start; a socket that dies before then is replaced.
  function preconnect() {
    if (warm || closing) return;
    const target = gatewayTarget();
    warm = connect(target.url, target.headers, setupAbort.signal).then(
      (socket) => {
        let alive = true;
        socket.onClose(() => { alive = false; });
        socket.onError(() => { alive = false; });
        if (closing) {
          close(socket);
          return undefined;
        }
        return { socket, alive: () => alive && socket.readyState === 1 };
      },
      () => undefined,
    );
  }

  function applySpeed(speed: VoiceSpeed) {
    prefs = { ...prefs, speed };
    if (!sessionID || gateway?.readyState !== 1 || speed === startedSpeed) return;
    startedSpeed = speed;
    gateway.send(
      JSON.stringify({
        type: "session.instructions.append",
        event_id: crypto.randomUUID(),
        delegation_id: null,
        content: paceUpdate(speed),
      }),
    );
  }

  function discardPendingWork() {
    pendingDelegations.length = 0;
    completedDelegation = undefined;
    clearTimeout(restartTimer);
    task?.abort();
  }

  function finish() {
    if (finished) return;
    finished = closing = true;
    if (tracked) track({ status: lastError ? 'failed' : finalUsage ? 'closed' : 'unconfirmed', finalized: finalUsage, confirmed_seconds: usageSeconds, answer_count: answerCount, search_count: searchCount, last_error: lastError, ended_at: new Date().toISOString() });
    clearTimeout(startTimer);
    clearInterval(idleTimer);
    clearTimeout(startupTimer);
    clearTimeout(closeTimer);
    clearTimeout(restartTimer);
    clearGreeting();
    discardPendingWork();
    setupAbort.abort();
    void warm?.then((w) => close(w?.socket));
    warm = undefined;
    close(gateway);
    close(browser);
    finishDrain?.();
  }

  function stop() {
    if (closing) return;
    closing = true;
    discardPendingWork();
    clearTimeout(startupTimer);
    clearTimeout(startTimer);
    clearInterval(idleTimer);
    clearGreeting();
    if (gateway?.readyState === 1) {
      execution.waitUntil(
        new Promise<void>((resolve) => {
          finishDrain = resolve;
        }),
      );
      closeTimer = setTimeout(finish, 15_000);
      try {
        gateway.send(JSON.stringify({ type: "session.close" }));
      } catch {
        finish();
      }
    } else {
      finish();
    }
  }

  function scheduleDelegation() {
    clearTimeout(restartTimer);
    if (closing || task || pendingDelegations.length === 0) return;
    restartTimer = setTimeout(() => execution.waitUntil(runDelegation()), 300);
  }

  function deliverResult(delegationID: string, answer: string, plan?: ReturnType<typeof planStudySchedule>) {
    if (closing) return;
    if (gateway?.readyState !== 1) return stop();
    try {
      for (const content of commentaryChunks(answer)) {
        gateway.send(
          JSON.stringify({
            type: "session.commentary.append",
            event_id: crypto.randomUUID(),
            delegation_id: typedAnswers.has(delegationID) ? null : delegationID,
            content,
          }),
        );
      }
      ncertDeck?.observe(answer);
      if (plan) emit({ type: "app.study_schedule.plan", delegation_id: delegationID, plan });
      const labels = prefs.quiz ? voiceQuizOptions(answer) : null;
      if (labels) {
        openQuiz = { id: crypto.randomUUID(), answered: false };
        emit({ type: "app.quiz.question", questionId: openQuiz.id, text: answer, labels });
      }
      emit({ type: "app.delegation.completed", delegation_id: delegationID });
      completedDelegation = pendingDelegations.shift();
    } catch {
      stop();
    }
  }

  async function runDelegation() {
    const pending = pendingDelegations[0];
    const event = pending?.event;
    const id = event?.delegation?.id;
    if (!pending || !event || !id || closing || task) return;
    if (!transcripts.some(({ role, text }) => role === "user" && text.trim())) return;
    const controller = new AbortController();
    task = controller;
    let taskRevision = revision;
    try {
      const answer = await answerQuestion(
        backendMessages,
        config,
        { runID, sessionID, delegationID: id },
        controller.signal,
        () => {
          const updates = transcripts.slice(transcriptCursor);
          if (updates.some(({ role, listeningSound }) => role === "user" && !listeningSound)) delete pending.plan;
          backendMessages.push(...updates.map(({ role, text }) => ({ role, content: text })));
          transcriptCursor = transcripts.length;
          taskRevision = revision;
        },
        (plan) => {
          pending.plan = plan;
        },
        prefs,
        () => { searchCount++; },
        ncertDeck ? ncertDeckPrompt(ncertDeck.next(), ncertDeck.pending()) : "",
      );
      if (closing || controller.signal.aborted) return;
      if (taskRevision !== revision) return;
      answerCount++;
      if (tracked) track({ answer_count: answerCount, search_count: searchCount });
      deliverResult(id, answer.trim(), pending.plan);
    } catch (error) {
      if (closing || controller.signal.aborted) return;
      backendMessages.push({
        role: "assistant",
        content:
          "The backend attempt failed. Completed tool results remain valid; verify uncertain external actions before any retry.",
      });
      if (taskRevision !== revision) return;
      emit({ type: 'app.delegation.error', delegation_id: id, error: { message: error instanceof Error ? error.message : 'The tutor could not finish this answer.' } });
      pendingDelegations.shift(); // Failure is terminal for this task; never replay it automatically.
    } finally {
      if (task === controller) task = undefined;
      scheduleDelegation();
    }
  }

  function queueDelegation(event: ProviderEvent) {
    pendingDelegations.push({ event });
    emit({ type: "app.delegation.pending", delegation_id: event.delegation?.id });
    scheduleDelegation();
  }

  function receiveGateway(data: unknown) {
    try {
      if (typeof data !== "string" || data.length > 1024 * 1024) throw new Error("Invalid voice event");
      const event: ProviderEvent = JSON.parse(data);
      if (browser.readyState === 1) browser.send(data);
      if (event.type === 'session.usage.updated' || event.type === 'session.closed') {
        const seconds = confirmedSeconds(event.usage?.seconds);
        if (seconds !== null) {
          usageSeconds = seconds;
          finalUsage = event.type === 'session.closed';
          if (tracked) track({ confirmed_seconds: seconds, finalized: finalUsage });
        }
      }
      if (event.type === "session.closed") {
        if (!closing) lastError = lastError ?? event.reason?.slice(0, 300) ?? 'Voice session ended unexpectedly';
        return finish();
      }
      if (event.type === "gateway.session.closing" || event.type === "gateway.error" || event.type === "app.error") {
        lastError = event.error?.message?.slice(0, 300) ?? event.reason?.slice(0, 300) ?? event.type;
        return stop();
      }
      if (closing) return;
      if (event.type === "gateway.session.created") {
        sessionID = event.session?.id;
        if (tracked) track({ session_id: sessionID ?? null, status: 'connected' });
        clearTimeout(startupTimer);
        // A speed change made while the session was being created applies now.
        applySpeed(prefs.speed);
        requestGreeting();
      }
      if (
        greetingCommand &&
        event.type === `session.${greetingCommand.type}.appended` &&
        event.client_event_id === greetingCommand.id
      ) {
        clearGreeting();
        emit({ type: "app.greeting.accepted" });
      } else if (greetingCommand && event.type === "error" && event.error?.client_event_id === greetingCommand.id) {
        clearGreeting();
        emit({ type: "app.greeting.error", error: { message: event.error.message ?? "The opening was rejected" } });
      }
      if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
        const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
        if (!event.delta?.trim()) return;
        // Whisper/noise tags and silence phantoms never reach captions or the tutor.
        if (role === "user") {
          if (isNoiseOnly(event.delta)) return;
          event.delta = cleanTranscript(event.delta);
        }
        lastTranscriptAt = Date.now();
        const listeningSound = role === "user" && Boolean(task) && isListeningSound(event.delta);
        transcripts.push({
          role,
          text: event.delta,
          start_ms: event.start_ms ?? 0,
          end_ms: event.end_ms ?? 0,
          listeningSound,
        });
        if (listeningSound) return;
        if (role === "user") {
          revision++;
          const offset = completedDelegation?.event.offset_ms;
          // Live has no transcript watermark; completed handoffs can receive late context.
          if (
            pendingDelegations.length === 0 &&
            completedDelegation &&
            typeof offset === "number" &&
            Number.isFinite(offset) &&
            offset >= 0 &&
            typeof event.start_ms === "number" &&
            Number.isFinite(event.start_ms) &&
            event.start_ms >= 0 &&
            event.start_ms <= offset
          ) {
            pendingDelegations.push(completedDelegation);
            completedDelegation = undefined;
          }
          if (pendingDelegations.length) {
            emit({ type: "app.delegation.pending", delegation_id: pendingDelegations[0]?.event.delegation?.id });
          }
        }
        scheduleDelegation();
      } else if (event.type === "session.delegation.created") {
        const id = event.delegation?.id;
        if (id && event.delegation?.target === "client" && !delegations.has(id)) {
          delegations.add(id);
          queueDelegation(event);
        }
      }
    } catch {
      emit({ type: "app.error", error: { message: "Invalid voice event or lost connection" } });
      stop();
    }
  }

  async function startSession(sdp: string) {
    if (closing || browser.readyState !== 1) return;
    clearTimeout(startTimer);
    startupTimer = setTimeout(() => {
      emit({ type: "app.error", error: { message: "Voice startup timed out" } });
      stop();
    }, 40_000);
    // The pause check and the Gateway socket run in parallel; a prepared call
    // usually has both finished already, so session.start goes out at once.
    const early = warm;
    warm = undefined;
    const target = gatewayTarget();
    const socket = (early ?? Promise.resolve(undefined)).then((w) => {
      if (w?.alive()) return w.socket;
      close(w?.socket);
      return connect(target.url, target.headers, setupAbort.signal);
    });
    const pending = pauseCheck ?? currentPause(config.backendModel);
    pauseCheck = undefined;
    const [paused, accepted] = await Promise.all([pending, socket]);
    if (paused) {
      close(accepted);
      throw new Error(paused.message);
    }
    if (closing || browser.readyState !== 1) {
      close(accepted);
      return;
    }
    gateway = accepted;
    gateway.onMessage(receiveGateway);
    gateway.onClose(() => {
      if (!finished) lastError = lastError ?? 'Voice gateway disconnected before final usage';
      finish();
    });
    gateway.onError(() => {
      lastError = 'Voice gateway connection failed';
      emit({ type: "app.error", error: { message: "Voice gateway connection failed" } });
      stop();
    });
    gateway.send(
      JSON.stringify({
        type: "session.start",
        session: {
          model: config.liveModel,
          instructions: [callInstructions(prefs), openingInstructions() && `Opening: ${openingInstructions()}`].filter(Boolean).join("\n"),
          audio: { output: { voice: prefs.voice } },
          delegation: { type: "client" },
        },
        transport: { type: "webrtc", sdp },
      }),
    );
  }

  browser.onMessage((data) => {
    try {
      if (typeof data !== "string" || data.length > 64 * 1024) throw new Error("Invalid client message");
      const event = JSON.parse(data);
      if (event.type === "session.close") return stop();
      if (closing) return;
      if (event.type === "app.prepare" && !gateway) {
        if (prepared || starting) throw new Error("Voice startup message required");
        prepared = true;
        prefs = parseCallPrefs(event.prefs);
        // The browser still needs its microphone and network offer: give it time.
        clearTimeout(startTimer);
        startTimer = setTimeout(startupMessageTimeout, 20_000);
        pauseCheck = currentPause(config.backendModel);
        preconnect();
        return;
      }
      if (!gateway) {
        if (starting || event.type !== "app.start" || typeof event.sdp !== "string" || !event.sdp.trim()) {
          throw new Error("Voice startup message required");
        }
        starting = true;
        if (event.prefs !== undefined || !prepared) prefs = parseCallPrefs(event.prefs);
        startedSpeed = prefs.speed;
        if (prefs.quiz && prefs.deep) ncertDeck = createNcertDeck(prefs);
        tracked = true;
        track({ voice: prefs.voice, accent: prefs.accent, quiz: prefs.quiz, search: prefs.search, documents: prefs.documents, status: 'starting' });
        emit({ type: 'app.call.record', callId: runID });
        execution.waitUntil(
          startSession(event.sdp).catch((error) => {
            lastError = error instanceof Error ? error.message.slice(0, 300) : 'Voice startup failed';
            if (!closing)
              emit({
                type: "app.error",
                error: { message: error instanceof Error ? error.message : "Voice startup failed" },
              });
            stop();
          }),
        );
        return;
      }
      if (event.type === "app.ready") {
        browserReady = true;
        requestGreeting();
        return;
      }
      if (event.type === "app.speed") {
        const speed = voiceSpeed(event.speed);
        if (speed === null) throw new Error("Unsupported speed");
        if (gateway.readyState !== 1) return stop();
        applySpeed(speed);
        emit({ type: "app.speed.applied", speed });
        return;
      }
      if (event.type === "app.quiz.answer") {
        const skipped = event.answer === VOICE_SKIP;
        if (!prefs.quiz || !openQuiz || openQuiz.answered || event.questionId !== openQuiz.id || (!skipped && !validVoiceAnswer(event.answer))) {
          emit({ type: "app.quiz.rejected", questionId: event.questionId, retryable: false, error: { message: "This question is no longer accepting answers." } });
          return;
        }
        openQuiz.answered = true;
        transcripts.push({ role: "user", text: skipped ? "Time is up, I skipped this question. Tell me the correct answer in one short line, then give the next MCQ." : `My answer is ${event.answer}. Check it and give the next MCQ.`, start_ms: 0, end_ms: 0, listeningSound: false });
        revision++;
        const id = crypto.randomUUID();
        typedAnswers.add(id);
        emit({ type: "app.quiz.accepted", questionId: openQuiz.id, answer: event.answer });
        queueDelegation({ type: "app.quiz.answer", delegation: { id, target: "client" } });
        return;
      }
      if (event.type === "app.chat.message") {
        // A typed message is student text like speech, never trusted instructions.
        const text = voiceChatText(event.text);
        const clientId = typeof event.id === "string" && event.id.length <= 64 ? event.id : undefined;
        if (!text || !sessionID || gateway.readyState !== 1) {
          emit({ type: "app.chat.rejected", id: clientId, error: { message: text ? "Call abhi judi nahi hai — judne ke baad bhejo." : "Message khaali ya 1000 akshar se lamba hai." } });
          return;
        }
        lastTranscriptAt = Date.now();
        transcripts.push({ role: "user", text, start_ms: 0, end_ms: 0, listeningSound: false });
        revision++;
        emit({ type: "app.chat.accepted", id: clientId, text });
        // A tutor answer already on its way picks up the new message (no duplicate reply).
        if (pendingDelegations.length) {
          emit({ type: "app.delegation.pending", delegation_id: pendingDelegations[0]?.event.delegation?.id });
          scheduleDelegation();
        } else {
          const id = crypto.randomUUID();
          typedAnswers.add(id);
          queueDelegation({ type: "app.chat.message", delegation: { id, target: "client" } });
        }
        return;
      }
      if (event.type !== "gateway.heartbeat") {
        throw new Error("Unsupported client event");
      }
      if (gateway.readyState !== 1) return stop();
      lastBrowserHeartbeatAt = Date.now();
      gateway.send(data);
    } catch {
      emit({ type: "app.error", error: { message: "Voice connection could not be started or continued" } });
      stop();
    }
  });
  browser.onClose(stop);
  browser.onError(stop);
  // Newer browsers use these to start early, change speed and type mid-call; older
  // browsers ignore it and keep the original app.start-only startup.
  emit({ type: "app.capabilities", prepare: true, speed: true, chat: true });
}
