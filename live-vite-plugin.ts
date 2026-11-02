import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { TLSSocket } from "node:tls";
import type { Plugin } from "vite";

import WebSocket, { WebSocketServer } from "ws";

import type { LiveConnector, LiveSocket } from "./src/lib/live-relay.server";

function liveSocket(socket: WebSocket): LiveSocket {
  return {
    get readyState() {
      return socket.readyState;
    },
    send(data) {
      if (socket.bufferedAmount > 256 * 1024) throw new Error("Voice connection is too slow");
      socket.send(data);
    },
    close(code = 1000, reason) {
      if (socket.readyState !== WebSocket.OPEN) return socket.terminate();
      socket.close(code, reason);
      const timer = setTimeout(() => socket.terminate(), 1000);
      timer.unref();
      socket.once("close", () => clearTimeout(timer));
    },
    onMessage(handler) {
      socket.on("message", (data, binary) => handler(binary ? data : data.toString()));
    },
    onClose(handler) {
      socket.on("close", handler);
    },
    onError(handler) {
      socket.on("error", handler);
    },
  };
}

const connectGateway: LiveConnector = (address, headers, signal) =>
  new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const url = new URL(address);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url, {
      headers,
      handshakeTimeout: 10_000,
      maxPayload: 2 * 1024 * 1024,
      followRedirects: false,
      perMessageDeflate: false,
    });
    const abort = () => {
      socket.terminate();
      reject(new Error("Voice connection cancelled"));
    };
    signal.addEventListener("abort", abort, { once: true });
    socket.once("close", () => signal.removeEventListener("abort", abort));
    socket.on("error", () => reject(new Error("Voice gateway connection failed")));
    socket.once("unexpected-response", (_request, response) => {
      let body = "";
      const rejectWithBody = () => {
        socket.terminate();
        let message = "";
        try {
          const parsed = JSON.parse(body) as { message?: unknown };
          if (typeof parsed.message === "string") message = parsed.message.slice(0, 300);
        } catch {
          message = "";
        }
        reject(new Error(message || `Voice gateway rejected the connection (${response.statusCode})`));
      };
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        if (body.length < 16 * 1024) body += chunk;
      });
      response.once("end", rejectWithBody);
      response.once("error", rejectWithBody);
    });
    socket.once("open", () => {
      if (signal.aborted) return abort();
      resolve(liveSocket(socket));
    });
  });

function upgradeRequest(request: IncomingMessage): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      headers.append(name, item);
    }
  }
  const host = request.headers.host;
  if (!host) throw new Error("Missing voice request host");
  const protocol = (request.socket as TLSSocket).encrypted ? "https:" : "http:";
  const origin = new URL(`${protocol}//${host}`).origin;
  const url = new URL(request.url ?? "/", origin);
  if (url.origin !== origin) throw new Error("Invalid voice request URL");
  return new Request(url, { method: request.method ?? "GET", headers });
}

function rejectUpgrade(socket: Duplex, status: number) {
  if (!socket.destroyed) {
    socket.end(`HTTP/1.1 ${status} Voice connection rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  }
}

export function liveVoiceDev(): Plugin {
  let dispose = () => {};
  return {
    name: "live-voice-dev",
    apply: "serve",
    configureServer(server) {
      const httpServer = server.httpServer;
      if (!httpServer) throw new Error("Live voice preview requires Vite's HTTP server");
      const sockets = new WebSocketServer({ noServer: true, maxPayload: 2 * 1024 * 1024 });
      let disposed = false;
      const upgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
        if (request.url?.split("?", 1)[0] !== "/api/live") return;
        socket.on("error", () => {});
        const timer = setTimeout(() => socket.destroy(), 10_000);
        timer.unref();
        void (async () => {
          try {
            const relay = (await server.ssrLoadModule(
              "/src/lib/live-relay.server.ts",
            )) as typeof import("./src/lib/live-relay.server");
            const config = relay.getLiveConfig();
            const rejection = relay.validateLiveUpgrade(upgradeRequest(request), { allowMissingOrigin: true });
            if (rejection) return rejectUpgrade(socket, rejection.status);
            if (socket.destroyed) return;
            sockets.handleUpgrade(request, socket, head, (connection) => {
              const browser = liveSocket(connection);
              relay.bindLiveConnection(
                browser,
                config,
                {
                  waitUntil(task) {
                    void task.catch(() => browser.close(1011, "Voice processing failed"));
                  },
                },
                connectGateway,
              );
            });
          } catch {
            rejectUpgrade(socket, 503);
          } finally {
            clearTimeout(timer);
          }
        })();
      };
      httpServer.on("upgrade", upgrade);
      dispose = () => {
        if (disposed) return;
        disposed = true;
        httpServer.off("upgrade", upgrade);
        httpServer.off("close", dispose);
        for (const socket of sockets.clients) socket.terminate();
        sockets.close();
      };
      httpServer.once("close", dispose);
    },
    closeBundle() {
      dispose();
    },
  };
}
