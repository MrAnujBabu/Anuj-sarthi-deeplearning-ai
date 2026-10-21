import { CLEAN_MIC } from "@/lib/noise-filter";
import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceQuizPlayback } from '@/lib/voice-quiz-playback';
import { liveEndpoint } from '@/lib/live-endpoint';
import { VOICE_SPEEDS, VOICE_SPEED_KEY, clampPlaybackRate, voiceSpeed, type VoiceSpeed } from '@/lib/voice-speed';

export type LiveEvent = {
  type: string;
  questionId?: string;
  labels?: Record<string, string>;
  answer?: string;
  reason?: string;
  error?: { message?: string };
  usage?: { seconds?: number };
  finalized?: boolean;
  transport?: { type?: string; sdp?: string };
  [key: string]: unknown;
};

/** Startup steps shown while connecting, so a slow step is visible. */
export type LiveStage = "mic" | "network" | "tutor" | "media";
export type LiveTimings = Partial<Record<"mic" | "socket" | "offer" | "answer" | "media", number>> & { total: number };

type LiveState = {
  status: "idle" | "connecting" | "connected" | "stopping" | "closed";
  stage: LiveStage | null;
  connectMs: number | null;
  error: string | null;
  hasConnected: boolean;
  finalized: boolean | null;
  muted: boolean;
  playbackBlocked: boolean;
  paused: boolean;
};

const initialState: LiveState = {
  status: "idle",
  stage: null,
  connectMs: null,
  error: null,
  hasConnected: false,
  finalized: null,
  muted: false,
  playbackBlocked: false,
  paused: false,
};

export function useLiveVoice(
  options: {
    url?: string;
    /** Per-call options sent with the start message (voice, accent, quiz, search, attached context). */
    prefs?: () => Record<string, unknown>;
    onEvent?: (event: LiveEvent) => void | Promise<void>;
  } = {},
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const controller = useRef<ReturnType<typeof createLiveVoice> | null>(null);
  const mounted = useRef(false);
  const latest = useRef(options);
  const [call, setCall] = useState(initialState);
  const [rate, setRateState] = useState<VoiceSpeed>(1);
  const rateRef = useRef<VoiceSpeed>(1);
  // Saved speed loads after hydration so server and browser render the same first frame.
  useEffect(() => {
    try {
      const saved = voiceSpeed(Number(window.localStorage.getItem(VOICE_SPEED_KEY)));
      if (saved) { rateRef.current = saved; setRateState(saved); }
    } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    latest.current = options;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const voice = controller.current;
      controller.current = null;
      voice?.stop();
    };
  }, []);

  const start = useCallback(() => {
    if (!mounted.current || controller.current) return;
    const audio = audioRef.current;
    if (!audio) {
      setCall((previous) => ({ ...previous, error: "Voice playback is not mounted." }));
      return;
    }
    let endpoint: URL;
    try {
      endpoint = new URL(liveEndpoint(window.location.href, latest.current.url));
    } catch {
      setCall((previous) => ({ ...previous, error: "Invalid voice connection URL." }));
      return;
    }
    const voice = createLiveVoice({
      url: endpoint.href,
      prefs: { ...(latest.current.prefs?.() ?? {}), speed: rateRef.current },
      audio,
      onEvent(event) {
        if (!mounted.current || controller.current !== voice) return;
        if (event.type === "app.stage" && typeof event["stage"] === "string") {
          const stage = event["stage"] as LiveStage;
          setCall((previous) => (previous.status === "connecting" ? { ...previous, stage } : previous));
        } else if (event.type === "app.connected") {
          const total = (event["timings"] as LiveTimings | undefined)?.total;
          setCall((previous) => ({ ...previous, status: "connected", stage: null, hasConnected: true, connectMs: typeof total === "number" ? total : null }));
        } else if (event.type === "app.stopping") {
          setCall((previous) => ({ ...previous, status: "stopping", playbackBlocked: false }));
        } else if (event.type === "app.closed") {
          controller.current = null;
          setCall((previous) => ({
            ...previous,
            status: "closed",
            muted: false,
            playbackBlocked: false,
            finalized: event.finalized === true,
          }));
        } else if (event.type === "app.playback.blocked" || event.type === "app.playback.resumed") {
          setCall((previous) => ({ ...previous, playbackBlocked: event.type === "app.playback.blocked" }));
        } else if (["app.error", "gateway.error", "error"].includes(event.type)) {
          setCall((previous) => ({ ...previous, error: event.error?.message ?? "Voice request failed." }));
        }
        try {
          void Promise.resolve(latest.current.onEvent?.(event)).catch((error) => {
            console.error("Live UI event handler failed", error);
          });
        } catch (error) {
          console.error("Live UI event handler failed", error);
        }
      },
    });
    controller.current = voice;
    setCall({ ...initialState, status: "connecting" });
    void voice.start();
  }, []);

  const stop = useCallback(() => {
    controller.current?.stop();
  }, []);
  const setMuted = useCallback((muted: boolean) => {
    if (controller.current?.setMuted(muted)) setCall((previous) => ({ ...previous, muted }));
  }, []);
  const setPaused = useCallback((paused: boolean) => {
    if (controller.current?.setPaused(paused)) setCall((previous) => ({ ...previous, paused }));
  }, []);
  const resumePlayback = useCallback(() => {
    void controller.current?.resumePlayback();
  }, []);
  const submitAnswer = useCallback((answer: string, questionId: string) => {
    return controller.current?.submitAnswer(answer, questionId) ?? false;
  }, []);
  /** Typed message to the tutor during a connected call; false when it could not be sent. */
  const sendText = useCallback((text: string, id: string) => {
    return controller.current?.sendText(text, id) ?? false;
  }, []);
  // A live stream always plays at 1× in the browser, so speed is the tutor's
  // own speaking pace: sent at call start and updated mid-call without reconnecting.
  // Returns true when a connected call picked up the change right away.
  const setRate = useCallback((value: number) => {
    const next = voiceSpeed(value) ?? 1;
    rateRef.current = next;
    setRateState(next);
    try { window.localStorage.setItem(VOICE_SPEED_KEY, String(next)); } catch { /* storage unavailable */ }
    return controller.current?.setSpeed(next) ?? false;
  }, []);

  return { ...call, rate, audioRef, start, stop, setMuted, setPaused, resumePlayback, submitAnswer, sendText, setRate };
}

type LiveOptions = {
  url: string;
  prefs: Record<string, unknown>;
  audio: HTMLAudioElement;
  onEvent: (event: LiveEvent) => void;
};

/** Speaking-speed choices for the voice settings (1× = normal tutor pace). */
export const PLAYBACK_SPEEDS = VOICE_SPEEDS;
export { clampPlaybackRate };

/** Send the offer once it can reach the voice server: a public (STUN) address, gathering done, or local candidates after a short settle. */
export const ICE_SETTLE_MS = 800;
export const ICE_MAX_MS = 3_000;
export function iceOfferReady(state: { elapsedMs: number; types: readonly string[]; complete: boolean }): boolean {
  if (state.complete) return true;
  if (state.types.some((type) => type === "srflx" || type === "relay")) return true;
  return state.types.length > 0 && state.elapsedMs >= ICE_SETTLE_MS;
}

/** True when the browser already allows the microphone, so the call socket can open alongside it. */
async function micAlreadyAllowed() {
  try {
    const status = await navigator.permissions?.query({ name: "microphone" as PermissionName });
    return status?.state === "granted";
  } catch {
    return false;
  }
}

/** A mobile-data blink up to this long must not end the call. */
export const ACK_GRACE_MS = 15_000;
export const MEDIA_GRACE_MS = 15_000;
/** Public STUN so phones behind carrier NAT get a reachable candidate. */
export const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

function createLiveVoice(options: LiveOptions) {
  let state: "idle" | "starting" | "active" | "stopping" | "closed" = "idle";
  let socket: WebSocket | undefined;
  let peer: RTCPeerConnection | undefined;
  let channel: RTCDataChannel | undefined;
  let microphone: MediaStream | undefined;
  let playback: MediaStream | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let cancelGathering: (() => void) | undefined;
  let lastAck = 0;
  let lastHeartbeat = 0;
  let mediaLostAt = 0;
  let answerReceived = false;
  let finalized = false;
  let muted = false;
  let paused = false;
  const quizPlayback = new VoiceQuizPlayback();
  let audioContext: AudioContext | undefined;
  let analyser: AnalyserNode | undefined;
  let audioSamples: Float32Array<ArrayBuffer> | undefined;
  let playbackTimer: ReturnType<typeof setInterval> | undefined;
  // Startup runs in parallel: the control socket opens while the microphone and
  // network offer are prepared; app.start goes out once both are ready.
  let offer: string | undefined;
  let startSent = false;
  let prepareSent = false;
  let capabilities = { prepare: false, speed: false, chat: false };
  let began = 0;
  const timings: Partial<Record<"mic" | "socket" | "offer" | "answer" | "media", number>> = {};
  const mark = (step: keyof typeof timings) => { timings[step] ??= Math.round(performance.now() - began); };
  const stage = (value: LiveStage) => options.onEvent({ type: "app.stage", stage: value });

  function observePlayback() {
    if (!options.prefs['quiz'] || !playback || analyser) return;
    try {
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser(); analyser.fftSize = 2048;
      audioContext.createMediaStreamSource(playback).connect(analyser);
      audioSamples = new Float32Array(analyser.fftSize);
      void audioContext.resume().catch(() => {});
      playbackTimer = setInterval(() => {
        if (!analyser || !audioSamples || state !== 'active') return;
        analyser.getFloatTimeDomainData(audioSamples);
        const level = Math.sqrt(audioSamples.reduce((sum, value) => sum + value * value, 0) / audioSamples.length);
        const id = quizPlayback.sample(level, performance.now(), !options.audio.paused && audioContext?.state === 'running');
        if (id) options.onEvent({ type: 'app.quiz.playback.ready', questionId: id });
      }, 100);
    } catch { /* Explicit timer start remains available if observation is unavailable. */ }
  }

  function starting() {
    return state === "starting";
  }

  function send(event: object) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
  }

  function stopAudio() {
    clearInterval(playbackTimer);
    void audioContext?.close().catch(() => {});
    audioContext = undefined; analyser = undefined;
    microphone?.getTracks().forEach((track) => track.stop());
    if (playback && options.audio.srcObject === playback) {
      options.audio.pause();
      options.audio.srcObject = null;
    }
  }

  function release() {
    if (state === "closed") return;
    state = "closed";
    stopTicker();
    clearTimeout(deadline);
    cancelGathering?.();
    window.removeEventListener("pagehide", stop);
    document.removeEventListener("visibilitychange", onVisible);
    void wakeLock?.release().catch(() => {});
    wakeLock = undefined;
    stopAudio();
    channel?.close();
    peer?.close();
    socket?.close();
    options.onEvent({ type: "app.closed", finalized });
  }

  function stop() {
    if (state === "stopping" || state === "closed") return;
    state = "stopping";
    try {
      send({ type: "session.close" });
    } catch {
      return release();
    }
    stopAudio();
    cancelGathering?.();
    stopTicker();
    clearTimeout(deadline);
    deadline = setTimeout(release, 15_000);
    options.onEvent({ type: "app.stopping" });
    if (!socket || socket.readyState !== WebSocket.OPEN) release();
  }

  function setMuted(value: boolean) {
    if (state !== "starting" && state !== "active") return false;
    muted = value;
    microphone?.getAudioTracks().forEach((track) => {
      track.enabled = !muted && !paused;
    });
    return true;
  }

  // Pause keeps the call connected but silences both sides: the microphone
  // stops sending and the tutor's audio is paused locally. Resume restores both.
  function setPaused(value: boolean) {
    if (state !== "active") return false;
    paused = value;
    microphone?.getAudioTracks().forEach((track) => {
      track.enabled = !muted && !paused;
    });
    if (paused) options.audio.pause();
    else void resumePlayback();
    return true;
  }

  async function resumePlayback() {
    if ((state !== "starting" && state !== "active") || !options.audio.srcObject) return;
    try {
      await options.audio.play();
      observePlayback();
      void audioContext?.resume().catch(() => {});
      if (state === "starting" || state === "active") options.onEvent({ type: "app.playback.resumed" });
    } catch {
      if (state === "starting" || state === "active") options.onEvent({ type: "app.playback.blocked" });
    }
  }

  function fail(message: string) {
    if (state === "stopping" || state === "closed") return;
    options.onEvent({ type: "app.error", error: { message } });
    options.onEvent({ type: "app.dropped" });
    stop();
  }

  function reportUnexpectedClosure(reason?: string) {
    if (state === "stopping" || state === "closed") return;
    const messages: Record<string, string> = {
      startup_timeout: "Voice startup timed out. Start a new call to retry.",
      initial_heartbeat_timeout: "Voice media did not connect. Start a new call to retry.",
      heartbeat_timeout: document.visibilityState === 'hidden' ? "The phone suspended the voice connection while the screen was off. Return to this page and start a new call." : "Voice connection was lost. Start a new call to retry.",
      gateway_shutdown: "The voice service restarted. Start a new call to reconnect.",
      inactivity_timeout: "The voice call ended after inactivity.",
      duration_limit: "The voice call reached its duration limit. Start a new call to continue.",
    };
    options.onEvent({
      type: "app.error",
      error: { message: messages[reason ?? ""] ?? "The voice call ended unexpectedly. Start a new call to retry." },
    });
  }

  function mediaReady() {
    return peer?.connectionState === "connected" && channel?.readyState === "open";
  }

  // Heartbeat every second while the call is active. A mobile-data blink can
  // briefly mark media "disconnected" while WebRTC recovers on its own, so we
  // keep heartbeating through it and only fail after MEDIA_GRACE_MS without
  // media or ACK_GRACE_MS without any ack.
  function pulse() {
    if (state !== "active") return;
    const now = Date.now();
    if (now - lastAck >= ACK_GRACE_MS) return fail("Voice control connection lost");
    if (mediaReady()) mediaLostAt = 0;
    else if (!mediaLostAt) mediaLostAt = now;
    else if (now - mediaLostAt >= MEDIA_GRACE_MS) return fail("Voice media connection lost. Start a new call to retry.");
    if (now - lastHeartbeat < 1000) return;
    if (socket?.readyState !== WebSocket.OPEN) return;
    try {
      send({ type: "gateway.heartbeat" });
      lastHeartbeat = now;
    } catch {
      fail("Voice control connection failed");
    }
  }

  // Worker ticks reduce background throttling, but still depend on the page
  // processing messages: an OS-suspended browser cannot keep a paid call alive.
  let ticker: Worker | undefined;
  let tickerUrl: string | undefined;
  function startTicker() {
    try {
      const src = "setInterval(() => postMessage(0), 1000);";
      tickerUrl = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      ticker = new Worker(tickerUrl);
      ticker.onmessage = () => pulse();
      ticker.onerror = () => {
        ticker?.terminate();
        ticker = undefined;
        if (heartbeat === undefined) heartbeat = setInterval(pulse, 1000);
      };
    } catch {
      ticker = undefined;
      heartbeat = setInterval(pulse, 1000);
    }
  }
  function stopTicker() {
    ticker?.terminate();
    ticker = undefined;
    if (tickerUrl) URL.revokeObjectURL(tickerUrl);
    tickerUrl = undefined;
    clearInterval(heartbeat);
    heartbeat = undefined;
  }

  let wakeLock: { release(): Promise<void> } | undefined;
  async function keepAwake() {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } };
      if (state === "active" && document.visibilityState === "visible" && nav.wakeLock && !wakeLock) {
        const lock = await nav.wakeLock.request("screen");
        if (state !== 'active' || document.visibilityState !== 'visible') { await lock.release(); return; }
        wakeLock = lock;
      }
    } catch {
      /* optional */
    }
  }
  function onVisible() {
    if (document.visibilityState === 'hidden') {
      void wakeLock?.release().catch(() => {});
      wakeLock = undefined;
      // Tell the relay before the OS suspends the page so it can hold the call.
      if (state === "active") send({ type: "app.background" });
      return;
    }
    if (document.visibilityState === "visible" && state === "active") {
      // The relay held the session while away; queued acks may not have been
      // processed yet, so don't let a stale ack timestamp end the call.
      lastAck = Date.now();
      send({ type: "app.foreground" });
      pulse();
      void keepAwake();
    }
  }

  function activate() {
    if (!answerReceived || !mediaReady()) return;
    if (starting()) {
      state = "active";
      mark("media");
      clearTimeout(deadline);
      lastAck = Date.now();
      lastHeartbeat = Date.now();
      startTicker();
      document.addEventListener("visibilitychange", onVisible);
      void keepAwake();
      pulse();
      if (state !== "active") return;
      send({ type: "app.ready" });
      const report = { ...timings, total: Math.round(performance.now() - began) };
      console.info("[voice] connected in", report.total, "ms", report);
      options.onEvent({ type: "app.connected", timings: report });
    } else pulse();
  }

  async function applyAnswer(event: LiveEvent) {
    if (!starting() || !peer) return;
    if (answerReceived || event.transport?.type !== "webrtc" || !event.transport.sdp) {
      throw new Error("Invalid voice session answer");
    }
    answerReceived = true;
    mark("answer");
    stage("media");
    clearTimeout(deadline);
    deadline = setTimeout(
      () => fail("Voice media did not connect within 12 seconds. Start a new call to retry."),
      12_000,
    );
    await peer.setRemoteDescription({ type: "answer", sdp: event.transport.sdp });
    activate();
  }

  // Waiting for "complete" can take the whole timeout on phones (extra
  // interfaces, IPv6, slow STUN). The voice server only needs one reachable
  // address, so send the offer as soon as iceOfferReady says it is usable.
  async function gatherCandidates(connection: RTCPeerConnection) {
    if (connection.iceGatheringState === "complete") return;
    const gatherStart = performance.now();
    const types: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (iceOfferReady({ elapsedMs: performance.now() - gatherStart, types, complete: connection.iceGatheringState === "complete" })) finish();
      };
      const settle = setTimeout(check, ICE_SETTLE_MS);
      // At the cap send what we have, as before: the voice server still learns
      // the phone's address from its connectivity checks (peer-reflexive).
      const timeout = setTimeout(() => finish(), ICE_MAX_MS);
      function finish(error?: Error) {
        clearTimeout(timeout);
        clearTimeout(settle);
        connection.removeEventListener("icegatheringstatechange", check);
        connection.removeEventListener("icecandidate", candidate);
        cancelGathering = undefined;
        if (error) reject(error);
        else resolve();
      }
      function candidate(event: RTCPeerConnectionIceEvent) {
        if (!event.candidate || !event.candidate.candidate) return finish();
        types.push(event.candidate.type ?? "host");
        check();
      }
      cancelGathering = () => finish(new Error("Call ended"));
      connection.addEventListener("icegatheringstatechange", check);
      connection.addEventListener("icecandidate", candidate);
      check();
    });
  }

  function sendStart() {
    if (startSent || !offer || socket?.readyState !== WebSocket.OPEN) return;
    startSent = true;
    send({ type: "app.start", sdp: offer, prefs: options.prefs });
  }

  function openSocket() {
    if (socket) return;
    socket = new WebSocket(options.url);
    deadline = setTimeout(() => fail("Voice session did not start"), 50_000);
    socket.onopen = () => {
      if (!starting()) return release();
      mark("socket");
      sendStart();
    };
    socket.onmessage = ({ data }) => {
      try {
        const event: LiveEvent = JSON.parse(data);
        if (event.type === "app.capabilities") {
          capabilities = { prepare: event["prepare"] === true, speed: event["speed"] === true, chat: event["chat"] === true };
          // The relay starts its checks and Gateway connection while the offer is still being prepared.
          if (capabilities.prepare && !startSent && !prepareSent && starting()) {
            prepareSent = true;
            send({ type: "app.prepare", prefs: options.prefs });
          }
          return;
        }
        if (event.type === "gateway.session.created") {
          void applyAnswer(event).catch(() => fail("Voice media negotiation failed"));
        } else if (event.type === "session.started") {
          activate();
        } else if (event.type === "gateway.heartbeat.ack") {
          lastAck = Date.now();
        } else if (event.type === "session.closed") {
          finalized =
            typeof event.usage?.seconds === "number" &&
            Number.isFinite(event.usage.seconds) &&
            event.usage.seconds >= 0;
          reportUnexpectedClosure(event.reason);
          options.onEvent(event);
          // Network-side endings can be retried with a fresh call; inactivity
          // and duration limits are intentional and stay ended.
          if (["startup_timeout", "initial_heartbeat_timeout", "heartbeat_timeout", "gateway_shutdown"].includes(event.reason ?? "")) {
            options.onEvent({ type: "app.dropped" });
          }
          return release();
        } else if (
          event.type === "gateway.session.closing" ||
          event.type === "gateway.error" ||
          event.type === "app.error"
        ) {
          if (event.type === "gateway.session.closing") reportUnexpectedClosure(event.reason);
          options.onEvent(event);
          return stop();
        }
        if (event.type === 'app.quiz.question' && typeof event.questionId === 'string') {
          quizPlayback.begin(event.questionId, event.labels?.['D'] ?? '');
        } else if (event.type === 'session.output_transcript.delta' && typeof event['delta'] === 'string') {
          quizPlayback.transcript(event['delta']);
        }
        options.onEvent(event);
      } catch {
        fail("Invalid voice event");
      }
    };
    socket.onerror = () => fail("Voice connection failed");
    socket.onclose = () => {
      if (state !== "stopping" && state !== "closed") {
        options.onEvent({ type: "app.error", error: { message: "Voice control connection closed" } });
        options.onEvent({ type: "app.dropped" });
      }
      release();
    };
  }

  async function start() {
    if (state !== "idle") return;
    state = "starting";
    began = performance.now();
    window.addEventListener("pagehide", stop);
    try {
      stage("mic");
      // With the microphone already allowed, the socket and relay warm-up run alongside it.
      if (await micAlreadyAllowed()) openSocket();
      if (!starting()) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: CLEAN_MIC,
      });
      microphone = stream;
      if (!starting()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mark("mic");
      openSocket();
      stage("network");
      const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peer = connection;
      for (const track of stream.getAudioTracks()) {
        track.enabled = !muted;
        track.addEventListener("ended", () => fail("The phone stopped microphone capture. Start a new call when this page is active."));
        connection.addTrack(track, stream);
      }
      connection.addEventListener("track", ({ track }) => {
        if (state === "stopping" || state === "closed") return;
        playback = new MediaStream([track]);
        options.audio.srcObject = playback;
        void resumePlayback();
      });
      connection.addEventListener("connectionstatechange", () => {
        if (connection.connectionState === "failed") fail("Voice media connection failed. Start a new call to retry.");
        else if (connection.connectionState === "closed") fail("Voice media connection closed");
        else activate();
      });
      channel = connection.createDataChannel("oai-events");
      channel.addEventListener("open", activate);
      channel.addEventListener("message", ({ data }) => {
        try {
          const event: LiveEvent = JSON.parse(data);
          if (event.type === "session.started") {
            activate();
          }
        } catch {
          fail("Invalid voice session event");
        }
      });
      channel.addEventListener("error", () => fail("Voice media connection failed"));
      channel.addEventListener("close", stop);
      await connection.setLocalDescription(await connection.createOffer());
      if (!starting()) return;
      await gatherCandidates(connection);
      if (!starting()) return;
      const sdp = connection.localDescription?.sdp;
      if (!sdp) throw new Error("Missing voice session offer");
      mark("offer");
      offer = sdp;
      stage("tutor");
      sendStart();
    } catch (error) {
      fail(error instanceof Error ? error.message : "Microphone startup failed");
    }
  }

  /** Mid-call speed change: the relay turns it into a speaking-pace instruction. */
  function setSpeed(speed: number) {
    if (state !== "active" || !capabilities.speed || socket?.readyState !== WebSocket.OPEN) return false;
    try { send({ type: "app.speed", speed }); return true; }
    catch { return false; }
  }

  function sendText(text: string, id: string) {
    if (state !== "active" || !capabilities.chat || socket?.readyState !== WebSocket.OPEN) return false;
    try { send({ type: "app.chat.message", text, id }); return true; }
    catch { return false; }
  }

  function submitAnswer(answer: string, questionId: string) {
    if (state !== "active" || socket?.readyState !== WebSocket.OPEN) return false;
    try { send({ type: "app.quiz.answer", answer, questionId }); return true; }
    catch { fail("The quiz answer could not be sent."); return false; }
  }

  return { start, stop, setMuted, setPaused, resumePlayback, submitAnswer, sendText, setSpeed };
}
