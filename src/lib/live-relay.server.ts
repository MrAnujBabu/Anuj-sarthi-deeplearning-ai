import { createAnthropic } from "@ai-sdk/anthropic";
import { stepCountIs, streamText, tool, type ModelMessage } from "ai";
import process from "node:process";
import { z } from "zod";
import { createAgentTools } from "@/lib/agent/tools.server";
import { validVoiceAnswer, voiceQuizOptions, VOICE_SKIP } from "@/lib/voice-quiz";
import { createVoiceTracking } from '@/lib/voice-tracking.server';
import { confirmedSeconds, documentMetadata, type VoiceDocument } from '@/lib/voice-usage';
import { VOICE_TUTOR_MODEL } from '@/lib/models';

export type CallPrefs = { voice: string; accent: "indian" | "neutral"; quiz: boolean; search: boolean; context: string; documents: VoiceDocument[] };
const VOICES = new Set(["marin", "meridian", "gleam", "vesper", "willow"]);
export function parseCallPrefs(raw: unknown): CallPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<"voice" | "accent" | "quiz" | "search" | "context" | "documents", unknown>>;
  return {
    voice: typeof r.voice === "string" && VOICES.has(r.voice) ? r.voice : "marin",
    accent: r.accent === "neutral" ? "neutral" : "indian",
    quiz: r.quiz === true,
    search: r.search === true,
    context: typeof r.context === "string" ? r.context.slice(0, 40_000) : "",
    documents: documentMetadata(r.documents),
  };
}

function callInstructions(prefs: CallPrefs) {
  const extra: string[] = [];
  if (prefs.accent === "indian")
    extra.push("Accent: Speak with a natural Indian English accent and Indian pronunciation, like a friendly Indian teacher; never an American accent.");
  if (prefs.quiz)
    extra.push("Quiz mode is ON: delegate to the backend to get one NEET MCQ at a time, read the question and options A-D aloud, wait for the student's spoken answer, then delegate again to check it and continue.");
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

async function gatewayRejection(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.slice(0, 300) : "";
  return new Error(message || `Voice gateway rejected the connection (${response.status})`);
}

export function validateLiveUpgrade(request: Request, options: { allowMissingOrigin?: boolean } = {}): Response | null {
  const origin = request.headers.get("origin");
  if (origin === null ? !options.allowMissingOrigin : origin !== new URL(request.url).origin) {
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

async function answerQuestion(
  messages: ModelMessage[],
  config: LiveConfig,
  correlation: { runID: string; sessionID: string | undefined; delegationID: string },
  signal: AbortSignal,
  consumeInput: () => void,
  onPlan: (plan: ReturnType<typeof planStudySchedule>) => void,
  prefs: CallPrefs = parseCallPrefs(null),
  onSearch: () => void = () => {},
) {
  signal.throwIfAborted();
  const provider = createAnthropic({
    baseURL: gatewayAPIBase(config.baseURL),
    apiKey: config.key,
    headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let responseCursor = 0;
  consumeInput();
  const result = streamText({
    model: provider(config.backendModel),
    maxOutputTokens: 16000, // Required Messages budget includes adaptive thinking.
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
      anthropic: { thinking: { type: "adaptive" }, effort: "low" },
    },
    system:
      "Help a spoken NEET 2027 tutor answer the latest student question (Physics, Chemistry, Biology; follow NCERT). " +
      "Reply in the student's language (Hinglish by default), written for speaking aloud: no tables, no LaTeX, no markdown. " +
      "Transcripts may be incomplete or corrected. Use the latest correction. " +
      "Continue from completed tool results; do not repeat completed actions. " +
      "Return verified facts and useful next steps in at most 150 words. " +
      "To display a study schedule for the current request, call plan_study_schedule with its total minutes and days. " +
      "Ask for missing details instead of guessing. The tool only calculates a draft plan; " +
      "it does not save calendar events." +
      (prefs.quiz ? " QUIZ MODE: give exactly one NEET MCQ with options labelled (A) (B) (C) (D), each on its own line (convert (1)-(4) numbering to A-D), no answer or check the student's spoken answer briefly and give the next MCQ." : "") +
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
    if (part.type === "error" || part.type === "abort") failed = true;
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
  let openQuiz: { id: string; answered: boolean } | undefined;
  const typedAnswers = new Set<string>();
  let transcriptCursor = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let finishDrain: (() => void) | undefined;
  let browserReady = false;
  let greetingRequested = false;
  let greetingCommand: { id: string; type: "instructions" | "commentary" } | undefined;
  let greetingTimer: ReturnType<typeof setTimeout> | undefined;
  // Live ends a session after ~120 s without transcript activity. When the
  // student goes quiet, the tutor briefly checks in (real speech, not a faked
  // heartbeat) so pauses don't drop the call; capped so an abandoned call ends.
  const IDLE_CHECKIN_MS = 70_000;
  const MAX_IDLE_CHECKINS = 6;
  let lastTranscriptAt = Date.now();
  let idleCheckins = 0;
  const idleTimer = setInterval(() => {
    if (closing || !browserReady || !sessionID || task || greetingCommand) return;
    if (gateway?.readyState !== 1) return;
    if (Date.now() - lastTranscriptAt < IDLE_CHECKIN_MS) return;
    if (idleCheckins >= MAX_IDLE_CHECKINS) return;
    idleCheckins++;
    lastTranscriptAt = Date.now();
    try {
      gateway.send(
        JSON.stringify({
          type: "session.commentary.append",
          event_id: crypto.randomUUID(),
          delegation_id: null,
          content:
            "The student has been silent for a while. In one short, warm Hinglish sentence, check whether they are still there or want to continue, then listen. Do not repeat earlier content.",
        }),
      );
    } catch {
      /* the gateway close path handles a broken socket */
    }
  }, 5000);
  const startTimer = setTimeout(() => {
    emit({ type: "app.error", error: { message: "Voice startup message timed out" } });
    stop();
  }, 5000);
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

  function requestGreeting() {
    const content = (
      config.openingInstructions ??
      "Start now in Hinglish: greet the student briefly as their NEET tutor and ask which doubt or topic they want to discuss today, then listen."
    ).trim();
    if (!content || !browserReady || !sessionID || greetingRequested || closing) return;
    greetingRequested = true;
    if (new TextEncoder().encode(content).length > 480) {
      emit({ type: "app.greeting.error", error: { message: "The opening instructions are too long" } });
      return;
    }
    greetingCommand = { id: crypto.randomUUID(), type: "instructions" };
    greetingTimer = setTimeout(() => {
      clearGreeting();
      emit({ type: "app.greeting.error", error: { message: "The opening could not be confirmed" } });
    }, 10_000);
    gateway?.send(
      JSON.stringify({
        type: "session.instructions.append",
        event_id: greetingCommand.id,
        delegation_id: null,
        content,
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
    restartTimer = setTimeout(() => void runDelegation(), 300);
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
      if (plan) emit({ type: "app.study_schedule.plan", delegation_id: delegationID, plan });
      const labels = prefs.quiz ? voiceQuizOptions(answer) : null;
      if (labels) {
        openQuiz = { id: crypto.randomUUID(), answered: false };
        emit({ type: "app.quiz.question", questionId: openQuiz.id, text: answer, labels });
      }
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
      );
      if (closing || controller.signal.aborted) return;
      if (taskRevision !== revision) return;
      answerCount++;
      if (tracked) track({ answer_count: answerCount, search_count: searchCount });
      deliverResult(id, answer.trim(), pending.plan);
    } catch {
      if (closing || controller.signal.aborted) return;
      backendMessages.push({
        role: "assistant",
        content:
          "The backend attempt failed. Completed tool results remain valid; verify uncertain external actions before any retry.",
      });
      if (taskRevision !== revision) return;
      deliverResult(id, "The backend could not finish the answer. Ask whether the user wants to try again.");
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
        requestGreeting();
      }
      if (
        greetingCommand &&
        event.type === `session.${greetingCommand.type}.appended` &&
        event.client_event_id === greetingCommand.id
      ) {
        if (greetingCommand.type === "instructions") {
          greetingCommand = { id: crypto.randomUUID(), type: "commentary" };
          gateway?.send(
            JSON.stringify({
              type: "session.commentary.append",
              event_id: greetingCommand.id,
              delegation_id: null,
              content: "Begin the conversation now, following the instructions provided.",
            }),
          );
        } else {
          clearGreeting();
          emit({ type: "app.greeting.accepted" });
        }
      } else if (greetingCommand && event.type === "error" && event.error?.client_event_id === greetingCommand.id) {
        clearGreeting();
        emit({ type: "app.greeting.error", error: { message: event.error.message ?? "The opening was rejected" } });
      }
      if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
        const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
        if (!event.delta?.trim()) return;
        lastTranscriptAt = Date.now();
        if (role === "user") idleCheckins = 0;
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
    const accepted = await connect(
      new URL(`${gatewayAPIBase(config.baseURL)}/live/sessions`).href,
      {
        "Lovable-API-Key": config.key,
        "X-Lovable-AIG-SDK": "fetch",
        "X-Lovable-AIG-Run-ID": runID,
      },
      setupAbort.signal,
    );
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
          instructions: callInstructions(prefs),
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
      if (!gateway) {
        if (starting || event.type !== "app.start" || typeof event.sdp !== "string" || !event.sdp.trim()) {
          throw new Error("Voice startup message required");
        }
        starting = true;
        prefs = parseCallPrefs(event.prefs);
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
      if (event.type === "app.quiz.answer") {
        const skipped = event.answer === VOICE_SKIP;
        if (!prefs.quiz || !openQuiz || openQuiz.answered || event.questionId !== openQuiz.id || (!skipped && !validVoiceAnswer(event.answer))) {
          emit({ type: "app.quiz.rejected", error: { message: "This question is no longer accepting answers." } });
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
      if (event.type !== "gateway.heartbeat") {
        throw new Error("Unsupported client event");
      }
      if (gateway.readyState !== 1) return stop();
      gateway.send(data);
    } catch {
      emit({ type: "app.error", error: { message: "Voice connection could not be started or continued" } });
      stop();
    }
  });
  browser.onClose(stop);
  browser.onError(stop);
}
