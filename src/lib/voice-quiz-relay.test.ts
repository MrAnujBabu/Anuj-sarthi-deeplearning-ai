import { afterEach, describe, expect, it, vi } from "vitest";
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
import { bindLiveConnection, type LiveSocket } from "./live-relay.server";

function socket() {
  let receive: (data: unknown) => void = () => {};
  const events: { type?: string; questionId?: string; labels?: unknown; delegation_id?: unknown }[] = [];
  const value: LiveSocket = { readyState: 1, send: (s) => events.push(JSON.parse(s)), close: () => {}, onMessage: (f) => { receive = f; }, onClose: () => {}, onError: () => {} };
  return { value, events, receive: (e: object) => receive(JSON.stringify(e)) };
}
afterEach(() => vi.useRealTimers());
describe("voice quiz relay", () => {
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