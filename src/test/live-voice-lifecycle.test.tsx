import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLiveVoice } from '@/hooks/use-live-voice';

class Track extends EventTarget {
  enabled = true;
  readyState = 'live';
  stop = vi.fn(() => { this.readyState = 'ended'; });
}
const microphone = new Track();
const quiet = new Track();
const replaceTrack = vi.fn(async (track: Track) => { sender.track = track; });
const sender = { track: microphone, replaceTrack };
class Socket {
  static OPEN = 1;
  static latest: Socket;
  readyState = 1;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  send = vi.fn();
  close = vi.fn(() => { this.readyState = 3; });
  constructor() { Socket.latest = this; queueMicrotask(() => this.onopen?.()); }
  receive(event: object) { this.onmessage?.({ data: JSON.stringify(event) }); }
}
class Channel extends EventTarget {
  readyState = 'open';
  close = vi.fn();
}
class Peer extends EventTarget {
  static latest: Peer;
  connectionState = 'connected';
  iceGatheringState = 'complete';
  localDescription = { sdp: 'test-offer' };
  channel = new Channel();
  close = vi.fn();
  constructor() { super(); Peer.latest = this; }
  addTrack() { return sender; }
  createDataChannel() { return this.channel; }
  createOffer = async () => ({ type: 'offer', sdp: 'test-offer' });
  setLocalDescription = async () => {};
  setRemoteDescription = async () => {};
}
const closeContext = vi.fn(async () => {});
class Speaker {
  resume = async () => {};
  close = closeContext;
  createMediaStreamDestination() { return { stream: { getAudioTracks: () => [quiet] } }; }
  createOscillator() { return { connect: () => ({ connect: () => {} }), start: () => {} }; }
  createGain() { return { gain: { value: 1 } }; }
}

beforeEach(() => {
  sender.track = microphone; microphone.enabled = true; microphone.readyState = 'live'; quiet.readyState = 'live';
  replaceTrack.mockReset().mockImplementation(async track => { sender.track = track; });
  vi.stubGlobal('WebSocket', Socket);
  vi.stubGlobal('RTCPeerConnection', Peer);
  vi.stubGlobal('AudioContext', Speaker);
  vi.stubGlobal('Worker', undefined);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [microphone], getAudioTracks: () => [microphone] })) } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

async function call() {
  const events = vi.fn();
  const hook = renderHook(() => useLiveVoice({ onEvent: events }));
  hook.result.current.audioRef.current = { pause: vi.fn(), srcObject: null } as unknown as HTMLAudioElement;
  act(() => hook.result.current.start());
  await waitFor(() => expect(Socket.latest.send).toHaveBeenCalledWith(expect.stringContaining('app.start')));
  await act(async () => Socket.latest.receive({ type: 'gateway.session.created', transport: { type: 'webrtc', sdp: 'test-answer' } }));
  expect(hook.result.current.status).toBe('connected');
  return { ...hook, events };
}

it('rapid speech start and cancellation restores the microphone after an in-flight silent swap', async () => {
  const hook = await call();
  let finish: (() => void) | undefined;
  replaceTrack.mockImplementationOnce(track => new Promise<void>(resolve => { finish = () => { sender.track = track; resolve(); }; }));
  act(() => hook.result.current.setEchoGate(true));
  await waitFor(() => expect(replaceTrack).toHaveBeenCalledTimes(1));
  act(() => hook.result.current.setEchoGate(false));
  await act(async () => { finish?.(); });
  await waitFor(() => expect(sender.track).toBe(microphone));
  expect(microphone.enabled).toBe(true);
  expect(hook.result.current.status).toBe('connected');
});

it('speech uses a silent track and returns to the mic without creating a replacement call', async () => {
  const hook = await call();
  await act(async () => hook.result.current.setEchoGate(true));
  expect(sender.track).toBe(quiet);
  await act(async () => hook.result.current.setEchoGate(false));
  expect(sender.track).toBe(microphone);
  expect(Socket.latest.send.mock.calls.filter(([data]) => JSON.parse(data).type === 'app.start')).toHaveLength(1);
});

it('mute remains in force when speech finishes', async () => {
  const hook = await call();
  await act(async () => hook.result.current.setEchoGate(true));
  act(() => hook.result.current.setMuted(true));
  await act(async () => hook.result.current.setEchoGate(false));
  expect(microphone.enabled).toBe(false);
  expect(hook.result.current.muted).toBe(true);
});

it('Stop releases microphone and silent speaker immediately and never starts another call', async () => {
  const hook = await call();
  await act(async () => hook.result.current.setEchoGate(true));
  act(() => hook.result.current.stop());
  expect(microphone.stop).toHaveBeenCalled();
  expect(quiet.stop).toHaveBeenCalled();
  expect(closeContext).toHaveBeenCalled();
  expect(hook.result.current.status).toBe('stopping');
  act(() => Socket.latest.receive({ type: 'session.closed', reason: 'close_requested', usage: { seconds: 20 } }));
  expect(hook.result.current.finalized).toBe(true);
  expect(hook.result.current.error).toBe(null);
  expect(Socket.latest.send.mock.calls.filter(([data]) => JSON.parse(data).type === 'app.start')).toHaveLength(1);
});

it('a heartbeat timeout remains a failure after final cleanup, not a successful call', async () => {
  const hook = await call();
  act(() => Socket.latest.receive({ type: 'session.closed', reason: 'heartbeat_timeout', usage: { seconds: 20 } }));
  expect(hook.result.current.status).toBe('closed');
  expect(hook.result.current.error).toBe('Voice connection was lost. Start a new call to retry.');
  expect(hook.result.current.finalized).toBe(true);
  expect(Socket.latest.send.mock.calls.filter(([data]) => JSON.parse(data).type === 'app.start')).toHaveLength(1);
});