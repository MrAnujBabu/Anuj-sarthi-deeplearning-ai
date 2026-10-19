import { afterEach, describe, expect, it, vi } from "vitest";
const { history } = vi.hoisted(() => ({ history: vi.fn() }));
vi.mock('./voice-tracking.server', () => ({ createVoiceTracking: () => history }));
vi.mock("ai", async (original) => {
  const actual = await original<typeof import("ai")>();
  return { ...actual, streamText: vi.fn(() => ({
    fullStream: (async function* () {
      yield { type: "finish-step" };
      yield { type: "finish", finishReason: "stop" };
    })(),
    text: Promise.resolve("Powerhouse? A. Nucleus B. Mitochondria C. Ribosome D. Golgi"),
  })) };
});
import { bindLiveConnection, getLiveConfig, type LiveSocket } from "./live-relay.server";

function socket() {
  let receive: (data: unknown) => void = () => {};
  const events: { type?: string; questionId?: string; labels?: unknown; delegation_id?: unknown }[] = [];
  const value: LiveSocket = { readyState: 1, send: (s) => events.push(JSON.parse(s)), close: () => {}, onMessage: (f) => { receive = f; }, onClose: () => {}, onError: () => {} };
  return { value, events, receive: (e: object) => receive(JSON.stringify(e)) };
}
afterEach(() => vi.useRealTimers());
describe("voice quiz relay", () => {
  it('uses powerful Claude Fable 5.1 for voice study without replacing live audio', () => {
    vi.stubEnv('LOVABLE_API_KEY', 'test');
    try {
      expect(getLiveConfig().backendModel).toBe('anthropic/claude-fable-5-1');
      expect(getLiveConfig().liveModel).toBe('openai/gpt-live-1');
    } finally { vi.unstubAllEnvs(); }
  });
  it('retains only gateway-confirmed final duration and metadata', async () => {
    vi.useFakeTimers(); history.mockClear();
    const browser = socket(), gateway = socket();
    bindLiveConnection(browser.value, { baseURL: 'https://example.com/v1', key: 'test', liveModel: 'test', backendModel: 'test' }, { waitUntil: () => {} }, async () => gateway.value);
    browser.receive({ type: 'app.start', sdp: 'test', prefs: { voice: 'meridian', quiz: true, search: true, documents: [{ name: 'test.pdf', pages: 1, chars: 100, method: 'ocr', text: 'private' }] } });
    await vi.advanceTimersByTimeAsync(0);
    gateway.receive({ type: 'gateway.session.created', session: { id: 'session-test' } });
    gateway.receive({ type: 'session.usage.updated', usage: { seconds: 30 } });
    gateway.receive({ type: 'session.closed', usage: { seconds: 90 }, reason: 'connection_lost' });
    expect(history.mock.calls.at(-1)?.[0]).toMatchObject({ confirmed_seconds: 90, finalized: true, status: 'failed', last_error: 'connection_lost' });
    expect(history.mock.calls[0]?.[0].documents).toEqual([{ name: 'test.pdf', pages: 1, chars: 100, method: 'ocr' }]);
  });
  it('records explicit End with final usage as closed, not failed', async () => {
    vi.useFakeTimers(); history.mockClear();
    const browser = socket(), gateway = socket();
    bindLiveConnection(browser.value, { baseURL: 'https://example.com/v1', key: 'test', liveModel: 'test', backendModel: 'test' }, { waitUntil: () => {} }, async () => gateway.value);
    browser.receive({ type: 'app.start', sdp: 'test' });
    await vi.advanceTimersByTimeAsync(0);
    browser.receive({ type: 'session.close' });
    gateway.receive({ type: 'session.closed', usage: { seconds: 45 }, reason: 'client_requested' });
    expect(history.mock.calls.at(-1)?.[0]).toMatchObject({ status: 'closed', finalized: true, confirmed_seconds: 45, last_error: null });
  });
  it("accepts one current A–D tap and rejects duplicate and stale taps", async () => {
    vi.useFakeTimers();
    const browser = socket(), gateway = socket();
    bindLiveConnection(browser.value, { baseURL: "https://example.com/v1", key: "test", liveModel: "test", backendModel: "test" }, { waitUntil: () => {} }, async () => gateway.value);
    browser.receive({ type: "app.start", sdp: "test", prefs: { quiz: true } });
    await vi.advanceTimersByTimeAsync(0);
    gateway.receive({ type: "session.input_transcript.delta", delta: "Ask me a quiz" });
    gateway.receive({ type: "session.delegation.created", delegation: { id: "first", target: "client" } });
    await vi.advanceTimersByTimeAsync(350);
    const question = browser.events.find((e) => e.type === "app.quiz.question");
    expect(question?.labels).toEqual({ A: "Nucleus", B: "Mitochondria", C: "Ribosome", D: "Golgi" });
    browser.receive({ type: "app.quiz.answer", questionId: "stale", answer: "B" });
    browser.receive({ type: "app.quiz.answer", questionId: question?.questionId, answer: "B" });
    browser.receive({ type: "app.quiz.answer", questionId: question?.questionId, answer: "B" });
    expect(browser.events.filter((e) => e.type === "app.quiz.accepted")).toHaveLength(1);
    expect(browser.events.filter((e) => e.type === "app.quiz.rejected")).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(350);
    expect(gateway.events.some((e) => e.type === "session.commentary.append" && e.delegation_id === null)).toBe(true);
    browser.receive({ type: "session.close" });
    gateway.receive({ type: "session.closed" });
  });
});