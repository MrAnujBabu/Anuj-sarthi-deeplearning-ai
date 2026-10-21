import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./voice-tracking.server", () => ({ createVoiceTracking: () => () => {} }));
vi.mock("./ai/pause.server", () => ({ getAiPause: async () => null, setAiPause: async () => {} }));
import { bindLiveConnection, type LiveSocket } from "./live-relay.server";

type Event = { type?: string; transport?: { type?: string; sdp?: string }; session?: { instructions?: string; [key: string]: unknown }; error?: { message?: string }; content?: string; delegation_id?: string; speed?: number; prepare?: boolean; [key: string]: unknown };
function socket(readyState = 1) {
  let receive: (data: unknown) => void = () => {};
  const events: Event[] = [];
  const value: LiveSocket = { readyState, send: (s) => events.push(JSON.parse(s)), close: () => {}, onMessage: (f) => { receive = f; }, onClose: () => {}, onError: () => {} };
  return { value, events, receive: (e: object) => receive(JSON.stringify(e)) };
}
const config = { baseURL: "https://example.com/v1", key: "test", liveModel: "test", backendModel: "test" };
afterEach(() => vi.useRealTimers());

describe("fast voice call startup", () => {
  it("tells newer browsers they can prepare early and change speed", () => {
    const browser = socket();
    bindLiveConnection(browser.value, config, { waitUntil: () => {} }, async () => socket().value);
    expect(browser.events[0]).toMatchObject({ type: "app.capabilities", prepare: true, speed: true, chat: true });
    browser.receive({ type: "session.close" });
  });

  it("opens the Gateway while the browser prepares its offer, then starts on that same socket", async () => {
    vi.useFakeTimers();
    const browser = socket(), gateway = socket();
    const connect = vi.fn(async () => gateway.value);
    bindLiveConnection(browser.value, config, { waitUntil: () => {} }, connect);
    browser.receive({ type: "app.prepare", prefs: { voice: "marin" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(gateway.events).toHaveLength(0); // no session (and nothing billed) before the offer
    await vi.advanceTimersByTimeAsync(6_000); // longer than the old 5 s startup window
    expect(browser.events.some((e) => e.type === "app.error")).toBe(false);
    browser.receive({ type: "app.start", sdp: "offer", prefs: { voice: "marin", speed: 1.5 } });
    await vi.advanceTimersByTimeAsync(0);
    expect(connect).toHaveBeenCalledTimes(1);
    const start = gateway.events.find((e) => e.type === "session.start");
    expect(start?.transport).toEqual({ type: "webrtc", sdp: "offer" });
    expect(start?.session?.instructions).toContain("1.5x");
    expect(start?.session?.instructions).toContain("Opening:");
    browser.receive({ type: "session.close" });
    gateway.receive({ type: "session.closed" });
  });

  it("ends a prepared call whose offer never arrives within 20 seconds", async () => {
    vi.useFakeTimers();
    const browser = socket();
    bindLiveConnection(browser.value, config, { waitUntil: () => {} }, async () => socket().value);
    browser.receive({ type: "app.prepare", prefs: {} });
    await vi.advanceTimersByTimeAsync(19_000);
    expect(browser.events.some((e) => e.type === "app.error")).toBe(false);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(browser.events.find((e) => e.type === "app.error")?.error?.message).toBe("Voice startup message timed out");
  });

  it("replaces an early Gateway socket that closed before the call started", async () => {
    vi.useFakeTimers();
    const browser = socket(), dead = socket(3), fresh = socket();
    const connect = vi.fn().mockResolvedValueOnce(dead.value).mockResolvedValueOnce(fresh.value);
    bindLiveConnection(browser.value, config, { waitUntil: () => {} }, connect);
    browser.receive({ type: "app.prepare", prefs: {} });
    await vi.advanceTimersByTimeAsync(0);
    browser.receive({ type: "app.start", sdp: "offer" });
    await vi.advanceTimersByTimeAsync(0);
    expect(connect).toHaveBeenCalledTimes(2);
    expect(dead.events).toHaveLength(0);
    expect(fresh.events.some((e) => e.type === "session.start")).toBe(true);
    browser.receive({ type: "session.close" });
    fresh.receive({ type: "session.closed" });
  });

  it("still accepts older browsers that send only app.start", async () => {
    vi.useFakeTimers();
    const browser = socket(), gateway = socket();
    bindLiveConnection(browser.value, config, { waitUntil: () => {} }, async () => gateway.value);
    browser.receive({ type: "app.start", sdp: "offer" });
    await vi.advanceTimersByTimeAsync(0);
    expect(gateway.events.some((e) => e.type === "session.start")).toBe(true);
    browser.receive({ type: "session.close" });
    gateway.receive({ type: "session.closed" });
  });

  it("starts the greeting with one command once media is ready", async () => {
    vi.useFakeTimers();
    const browser = socket(), gateway = socket();
    bindLiveConnection(browser.value, config, { waitUntil: () => {} }, async () => gateway.value);
    browser.receive({ type: "app.start", sdp: "offer" });
    await vi.advanceTimersByTimeAsync(0);
    gateway.receive({ type: "gateway.session.created", session: { id: "s1" } });
    expect(gateway.events.filter((e) => e.type === "session.commentary.append")).toHaveLength(0); // never before media
    browser.receive({ type: "app.ready" });
    expect(gateway.events.filter((e) => e.type === "session.commentary.append")).toHaveLength(1);
    expect(gateway.events.filter((e) => e.type === "session.instructions.append")).toHaveLength(0);
    browser.receive({ type: "session.close" });
    gateway.receive({ type: "session.closed" });
  });

  it("turns a mid-call speed change into one pace instruction and rejects unknown speeds", async () => {
    vi.useFakeTimers();
    const browser = socket(), gateway = socket();
    bindLiveConnection(browser.value, config, { waitUntil: () => {} }, async () => gateway.value);
    browser.receive({ type: "app.start", sdp: "offer" });
    await vi.advanceTimersByTimeAsync(0);
    gateway.receive({ type: "gateway.session.created", session: { id: "s1" } });
    browser.receive({ type: "app.ready" });
    browser.receive({ type: "app.speed", speed: 1.25 });
    const pace = gateway.events.filter((e) => e.type === "session.instructions.append");
    expect(pace).toHaveLength(1);
    expect(pace[0]?.content).toContain("1.25x");
    expect(pace[0]?.delegation_id).toBeNull();
    expect(browser.events.some((e) => e.type === "app.speed.applied" && e.speed === 1.25)).toBe(true);
    browser.receive({ type: "app.speed", speed: 9 });
    expect(gateway.events.some((e) => e.type === "session.close")).toBe(true);
    gateway.receive({ type: "session.closed" });
  });

  it("answers a typed chat message once, even when two arrive before the reply", async () => {
    vi.useFakeTimers();
    const browser = socket(), gateway = socket();
    bindLiveConnection(browser.value, config, { waitUntil: () => {} }, async () => gateway.value);
    browser.receive({ type: "app.start", sdp: "offer" });
    await vi.advanceTimersByTimeAsync(0);
    browser.receive({ type: "app.chat.message", text: "Too early", id: "c0" });
    expect(browser.events.find((e) => e.type === "app.chat.rejected")).toMatchObject({ id: "c0" });
    gateway.receive({ type: "gateway.session.created", session: { id: "s1" } });
    browser.receive({ type: "app.ready" });
    browser.receive({ type: "app.chat.message", text: "  Mitosis ke phases batao  ", id: "c1" });
    browser.receive({ type: "app.chat.message", text: "aur meiosis bhi", id: "c2" });
    const accepted = browser.events.filter((e) => e.type === "app.chat.accepted");
    expect(accepted.map((e) => [e["id"], e["text"]])).toEqual([["c1", "Mitosis ke phases batao"], ["c2", "aur meiosis bhi"]]);
    const pending = new Set(browser.events.filter((e) => e.type === "app.delegation.pending").map((e) => e.delegation_id));
    expect(pending.size).toBe(1);
    browser.receive({ type: "session.close" });
    gateway.receive({ type: "session.closed" });
  });

  it("rejects an empty or over-long typed message without ending the call", async () => {
    vi.useFakeTimers();
    const browser = socket(), gateway = socket();
    bindLiveConnection(browser.value, config, { waitUntil: () => {} }, async () => gateway.value);
    browser.receive({ type: "app.start", sdp: "offer" });
    await vi.advanceTimersByTimeAsync(0);
    gateway.receive({ type: "gateway.session.created", session: { id: "s1" } });
    browser.receive({ type: "app.chat.message", text: "   ", id: "e" });
    browser.receive({ type: "app.chat.message", text: "x".repeat(1001), id: "l" });
    expect(browser.events.filter((e) => e.type === "app.chat.rejected").map((e) => e["id"])).toEqual(["e", "l"]);
    expect(browser.events.some((e) => e.type === "app.chat.accepted")).toBe(false);
    expect(gateway.events.some((e) => e.type === "session.close")).toBe(false);
    browser.receive({ type: "session.close" });
    gateway.receive({ type: "session.closed" });
  });
});
