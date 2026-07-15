// S7: Node 22 port of the S1 spike server — single-writer command loop over
// SQLite (WAL) + WS pub/sub fanout, written against the platform seam (seam.ts).
// The ONLY platform-specific import is platform-node.ts; swap it for a
// platform-bun.ts and this file runs unchanged on Bun.
//
// Flow per command: WS message -> queue -> (single writer) one SQLite txn
// (read old kv value, upsert kv, insert event, insert change) -> ack to sender
// -> publish(patch) to the sender's group topic (echoes to sender: it is
// subscribed, matching Bun server.publish semantics — see README).
//
// Env: PORT (default 4311), DB_PATH (default ./data/spike.db), SYNCHRONOUS
// (default NORMAL), WAL_AUTOCHECKPOINT, CHECKPOINT_MODE=inline|worker

import { openDatabase, createWsServer, startCheckpointer, platformName } from "./platform-node.ts";
import type { PlatformSocket } from "./seam.ts";

const PORT = Number(process.env.PORT ?? 4311);
const DB_PATH = process.env.DB_PATH ?? `${import.meta.dirname}/data/spike.db`; // import.meta.dirname (Node >=20.11); Bun spells it import.meta.dir
const SYNCHRONOUS = process.env.SYNCHRONOUS ?? "NORMAL";

// ---------------------------------------------------------------- DB setup
const WAL_AUTOCHECKPOINT = process.env.WAL_AUTOCHECKPOINT; // pages; SQLite default is 1000
const CHECKPOINT_MODE = process.env.CHECKPOINT_MODE ?? "inline"; // inline (SQLite default) | worker

const db = openDatabase(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec(`PRAGMA synchronous = ${SYNCHRONOUS}`);
db.exec("PRAGMA busy_timeout = 5000"); // ride out RESTART checkpoints from the worker
if (WAL_AUTOCHECKPOINT !== undefined) db.exec(`PRAGMA wal_autocheckpoint = ${WAL_AUTOCHECKPOINT}`);

// worker mode: writer never checkpoints; a worker_threads Worker runs PASSIVE checkpoints every 1s (+RESTART every 10s).
let lastCheckpoint: unknown = null;
if (CHECKPOINT_MODE === "worker") {
  db.exec("PRAGMA wal_autocheckpoint = 0");
  startCheckpointer(DB_PATH, 1000, (r) => { lastCheckpoint = r; });
}
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    key         TEXT NOT NULL,
    value       TEXT NOT NULL,
    updated_seq INTEGER NOT NULL,
    PRIMARY KEY (entity_type, entity_id, key)
  );
  CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY, ts INTEGER NOT NULL, actor TEXT NOT NULL, payload TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS changes (
    seq INTEGER NOT NULL, entity TEXT NOT NULL, key TEXT NOT NULL, old TEXT, new TEXT NOT NULL
  );
`);

// Prepared once at startup, reused for every command (the seam's prepare() is
// uncached by contract — bun's db.query() cache is a bun-only convenience).
const qOld = db.prepare<{ value: string }>(
  "SELECT value FROM kv WHERE entity_type=? AND entity_id=? AND key=?");
const qUpsert = db.prepare(`
  INSERT INTO kv (entity_type, entity_id, key, value, updated_seq) VALUES (?,?,?,?,?)
  ON CONFLICT(entity_type, entity_id, key) DO UPDATE SET value=excluded.value, updated_seq=excluded.updated_seq`);
const qEvent = db.prepare("INSERT INTO events (seq, ts, actor, payload) VALUES (?,?,?,?)");
const qChange = db.prepare("INSERT INTO changes (seq, entity, key, old, new) VALUES (?,?,?,?,?)");

let seq: number = (db.prepare<{ m: number }>("SELECT COALESCE(MAX(seq),0) AS m FROM events").get())!.m;

type Ctx = { id: string; group: number };
type Cmd = { ws: PlatformSocket<Ctx>; m: any };

// One command = one txn. BEGIN IMMEDIATE (we are the only writer, but take the write lock up front).
const applyTxn = db.transaction((c: Cmd, s: number): string | null => {
  const { m, ws } = c;
  const old = qOld.get("player", ws.data.id, m.key);
  qUpsert.run("player", ws.data.id, m.key, String(m.value), s);
  qEvent.run(s, Date.now(), ws.data.id, JSON.stringify(m));
  qChange.run(s, `player/${ws.data.id}`, m.key, old?.value ?? null, String(m.value));
  return old?.value ?? null;
});

// ---------------------------------------------------------------- single-writer queue
const queue: Cmd[] = [];
let head = 0;
let draining = false;

const stats = {
  processed: 0, maxQueue: 0, pubBackpressure: 0, pubDropped: 0,
  conns: 0, startedAt: Date.now(), maxTxnMs: 0,
  slowTxns: [] as { seq: number; ms: number; t: number }[],     // txns > 10ms (SQLite-side stalls)
  loopStalls: [] as { t: number; lagMs: number }[],             // event-loop stalls > 50ms (GC etc.)
  rssHistory: [] as { t: number; rssMB: number; queue: number; processed: number }[],
};

function enqueue(c: Cmd) {
  queue.push(c);
  const depth = queue.length - head;
  if (depth > stats.maxQueue) stats.maxQueue = depth;
  if (!draining) { draining = true; setImmediate(drain); }
}

// Process commands strictly one at a time; yield to the event loop every ~5ms
// so acks/patches flush and new messages are read.
function drain() {
  const deadline = performance.now() + 5;
  while (head < queue.length) {
    processOne(queue[head++]);
    if (performance.now() >= deadline) break;
  }
  if (head > 4096) { queue.splice(0, head); head = 0; } // keep the ring compact
  if (head < queue.length) setImmediate(drain);
  else { queue.length = 0; head = 0; draining = false; }
}

function processOne(c: Cmd) {
  const s = ++seq;
  const t0 = performance.now();
  applyTxn.immediate(c, s);
  const dt = performance.now() - t0;
  if (dt > stats.maxTxnMs) stats.maxTxnMs = dt;
  if (dt > 10 && stats.slowTxns.length < 50)
    stats.slowTxns.push({ seq: s, ms: +dt.toFixed(1), t: Math.round((Date.now() - stats.startedAt) / 1000) });
  stats.processed++;
  c.ws.send(JSON.stringify({ t: "ack", cid: c.m.cid, seq: s, sentAt: c.m.sentAt }));
  const patch = JSON.stringify({
    t: "patch", seq: s, group: c.ws.data.group, key: c.m.key, value: c.m.value,
    origin: c.ws.data.id, sentAt: c.m.sentAt,
  });
  const r = server.publish(`g:${c.ws.data.group}`, patch);
  stats.pubBackpressure += r.backpressure;
  stats.pubDropped += r.dropped;
}

// ---------------------------------------------------------------- server
const server = createWsServer<Ctx>({
  port: PORT,
  // ws has no idleTimeout knob at all (Bun requires <=255s); production seam needs a ping/pong heartbeat — irrelevant for this spike (constant traffic).
  context: (url) => ({ id: url.searchParams.get("id") ?? "anon", group: Number(url.searchParams.get("group") ?? 0) }),
  http: (url) => (url.pathname === "/stats" ? snapshot() : undefined),
  open(ws) {
    stats.conns++;
    ws.subscribe(`g:${ws.data.group}`);
    ws.send(JSON.stringify({ t: "welcome", id: ws.data.id }));
  },
  message(ws, raw) {
    const m = JSON.parse(raw);
    if (m.t === "cmd") enqueue({ ws, m });
  },
  close(ws) { stats.conns--; },
});

function snapshot() {
  return {
    rssMB: +(process.memoryUsage().rss / 1e6).toFixed(1),
    queueDepth: queue.length - head,
    lastCheckpoint,
    ws: server.metrics(),
    ...stats,
    uptimeSec: Math.round((Date.now() - stats.startedAt) / 1000),
  };
}

// Event-loop stall detector: a 50ms heartbeat that arrives late means something
// (GC, checkpoint, long drain slice) blocked the loop.
let lastBeat = performance.now();
setInterval(() => {
  const now = performance.now();
  const lag = now - lastBeat - 50;
  if (lag > 50 && stats.loopStalls.length < 100)
    stats.loopStalls.push({ t: Math.round((Date.now() - stats.startedAt) / 1000), lagMs: +lag.toFixed(0) });
  lastBeat = now;
}, 50);

setInterval(() => {
  stats.rssHistory.push({
    t: Math.round((Date.now() - stats.startedAt) / 1000),
    rssMB: +(process.memoryUsage().rss / 1e6).toFixed(1),
    queue: queue.length - head,
    processed: stats.processed,
  });
}, 5000);

console.log(`s7 server [${platformName}] on :${PORT} db=${DB_PATH} synchronous=${SYNCHRONOUS} ckpt=${CHECKPOINT_MODE} pid=${process.pid}`);
