// S7: Node 22 implementation of the platform seam — better-sqlite3 + ws.
// Pub/sub is a topic -> Set<socket> map with per-topic serialize-once fanout:
// the patch string is encoded to a Buffer ONCE, then sent to every subscriber
// as a TEXT frame ({ binary:false }), so per-socket cost is just framing+write
// (server->client frames are unmasked; ws never re-encodes the payload).

import { createServer as createHttpServer } from "node:http";
import { Worker } from "node:worker_threads";
import { WebSocketServer } from "ws";
import type { WebSocket as WsWebSocket } from "ws";
import Database from "better-sqlite3";
import type { PlatformSocket, PublishResult, SqliteDriver, WsServer, WsServerOptions } from "./seam.ts";

export const platformName = `node ${process.version} + better-sqlite3 + ws`;

// ---------------------------------------------------------------- SqliteDriver
export function openDatabase(path: string): SqliteDriver {
  // better-sqlite3 creates the file by default (bun:sqlite needs {create:true});
  // its constructor also sets busy_timeout=5000 by default (`timeout` option) —
  // the callers still set it explicitly so both backends run identical PRAGMAs.
  const db = new Database(path);
  return {
    exec: (sql) => { db.exec(sql); },
    // better-sqlite3's Statement (.get/.run/.all) and Transaction (callable +
    // .immediate) natively satisfy the seam — bun:sqlite copied this API.
    prepare: <Row,>(sql: string) => db.prepare(sql) as never as import("./seam.ts").SqliteStmt<Row>,
    transaction: (fn) => db.transaction(fn),
    close: () => db.close(),
  };
}

// ---------------------------------------------------------------- WsServer
const OPEN = 1; // WebSocket.OPEN
const BACKPRESSURE_HIGH_WATER = 1 << 20; // 1 MiB per socket: seam-defined (ws has no signal of its own; Bun's publish() returns -1 on its internal limit)
const TEXT_FRAME = { binary: false, compress: false, fin: true } as const;

type TrackedWs = WsWebSocket & { s7topics?: string[] };

export function createWsServer<Ctx>(opts: WsServerOptions<Ctx>): WsServer<Ctx> {
  const topics = new Map<string, Set<TrackedWs>>();
  const metrics = { maxBufferedAmount: 0, sendErrors: 0 };
  const sendErrCb = (err?: Error) => { if (err) metrics.sendErrors++; };

  const http = createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const body = opts.http?.(url);
    if (body !== undefined) {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(body));
    } else {
      res.statusCode = 404;
      res.end("s7 spike server (node)");
    }
  });

  // noServer + manual upgrade so the per-connection context comes from the
  // upgrade URL, mirroring Bun's srv.upgrade(req, { data }).
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, clientTracking: false });

  http.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/ws") { socket.destroy(); return; }
    const ctx = opts.context(url);
    wss.handleUpgrade(req, socket, head, (ws: TrackedWs) => {
      const sock: PlatformSocket<Ctx> = {
        data: ctx,
        send: (message) => ws.send(message, sendErrCb),
        subscribe: (topic) => {
          let set = topics.get(topic);
          if (!set) topics.set(topic, (set = new Set()));
          set.add(ws);
          (ws.s7topics ??= []).push(topic);
        },
      };
      ws.on("message", (data) => opts.message(sock, data.toString())); // ws delivers Buffer even for TEXT frames (Bun delivers string)
      ws.on("close", () => {
        for (const t of ws.s7topics ?? []) topics.get(t)?.delete(ws);
        opts.close?.(sock);
      });
      ws.on("error", () => { /* close event follows; counted there */ });
      opts.open?.(sock);
    });
  });

  http.listen(opts.port);

  return {
    publish(topic, message) {
      const set = topics.get(topic);
      if (!set || set.size === 0) return { queued: 0, backpressure: 0, dropped: 0 };
      const payload = Buffer.from(message); // serialize-once: one encode per publish, shared by all subscribers
      let queued = 0, backpressure = 0, dropped = 0;
      for (const ws of set) {
        if (ws.readyState !== OPEN) { dropped++; continue; }
        ws.send(payload, TEXT_FRAME, sendErrCb);
        queued++;
        const buffered = ws.bufferedAmount;
        if (buffered > 0) {
          if (buffered > metrics.maxBufferedAmount) metrics.maxBufferedAmount = buffered;
          if (buffered > BACKPRESSURE_HIGH_WATER) backpressure++;
        }
      }
      return { queued, backpressure, dropped } satisfies PublishResult;
    },
    metrics: () => ({ ...metrics }),
    stop() { wss.close(); http.close(); },
  };
}

// ---------------------------------------------------------------- checkpointer
// Platform-specific by nature (worker_threads vs Bun's web Worker; own DB conn).
export function startCheckpointer(dbPath: string, intervalMs: number, onTick: (r: unknown) => void): Worker {
  const w = new Worker(new URL("./checkpointer.ts", import.meta.url));
  w.on("message", onTick);
  w.postMessage({ path: dbPath, intervalMs });
  w.unref();
  return w;
}
