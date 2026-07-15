// S1 spike load harness: N WebSocket clients, K per group, fixed total command rate.
// Measures command->ack latency (sender clock) and patch-receipt latency (group
// members, same process => same performance.now() clock). Checks per-group seq
// monotonicity. Samples server RSS via /stats at start/mid/end.
//
// Usage: bun harness.ts --conns 1000 --groups 250 --rate 200 --duration 120 --port 4311

function arg(name: string, def: number) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : def;
}
const CONNS = arg("conns", 1000);
const GROUPS = arg("groups", 250);
const RATE = arg("rate", 200);       // total commands/sec across all clients
const DURATION = arg("duration", 120); // seconds
const PORT = arg("port", 4311);
const BASE = `http://127.0.0.1:${PORT}`;

const ackLat: number[] = [];
const patchLat: number[] = [];
let sent = 0, acked = 0, patches = 0, selfPatches = 0, orderingViolations = 0, maxSendLag = 0;

type Client = { ws: WebSocket; id: string; lastSeq: number };
const clients: Client[] = [];

function connect(i: number): Promise<Client> {
  return new Promise((resolve, reject) => {
    const id = `c${i}`;
    const group = i % GROUPS; // 4 per group for 1000/250
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?id=${id}&group=${group}`);
    const c: Client = { ws, id, lastSeq: 0 };
    ws.onmessage = (ev) => {
      const now = performance.now();
      const m = JSON.parse(ev.data as string);
      if (m.t === "ack") { acked++; ackLat.push(now - m.sentAt); }
      else if (m.t === "patch") {
        if (m.seq <= c.lastSeq) orderingViolations++;
        c.lastSeq = m.seq;
        if (m.origin === id) selfPatches++;           // server.publish includes the sender
        else { patches++; patchLat.push(now - m.sentAt); }
      } else if (m.t === "welcome") resolve(c);
    };
    ws.onerror = (e) => reject(new Error(`ws ${id}: ${e}`));
  });
}

function pct(xs: number[], p: number) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
const summary = (xs: number[]) => ({
  count: xs.length,
  p50: +pct(xs, 50).toFixed(2), p95: +pct(xs, 95).toFixed(2),
  p99: +pct(xs, 99).toFixed(2),
  max: +xs.reduce((a, b) => (b > a ? b : a), 0).toFixed(2), // no spread: 1M+ samples blow the stack
});
const stats = () => fetch(`${BASE}/stats`).then((r) => r.json());

// ---------------------------------------------------------------- connect (batched)
for (let i = 0; i < CONNS; i += 200) {
  const batch = [];
  for (let j = i; j < Math.min(i + 200, CONNS); j++) batch.push(connect(j));
  clients.push(...(await Promise.all(batch)));
}
console.error(`connected ${clients.length} clients across ${GROUPS} groups`);

const statsStart = await stats();
let statsMid: any = null;
setTimeout(async () => { statsMid = await stats(); }, (DURATION / 2) * 1000);

// ---------------------------------------------------------------- send loop
// Catch-up scheduler: every tick, send however many commands are due at RATE.
const TOTAL = RATE * DURATION;
const t0 = performance.now();
let rr = 0;
await new Promise<void>((done) => {
  const timer = setInterval(() => {
    const due = Math.min(TOTAL, Math.floor((RATE * (performance.now() - t0)) / 1000));
    const lag = due - sent;
    if (lag > maxSendLag) maxSendLag = lag;
    while (sent < due) {
      const c = clients[rr++ % clients.length];
      const n = sent++;
      c.ws.send(JSON.stringify({ t: "cmd", cid: n, key: `k${n % 4}`, value: n, sentAt: performance.now() }));
    }
    if (sent >= TOTAL) { clearInterval(timer); done(); }
  }, 5);
});
const sendWallSec = (performance.now() - t0) / 1000;

// drain in-flight acks/patches
await Bun.sleep(3000);
const statsEnd = await stats();
for (const c of clients) c.ws.close();

console.log(JSON.stringify({
  config: { CONNS, GROUPS, RATE, DURATION },
  sent, acked, sendWallSec: +sendWallSec.toFixed(1),
  achievedCmdPerSec: +(acked / sendWallSec).toFixed(1),
  maxSendLag,
  ack: summary(ackLat),
  patch: summary(patchLat),
  patchesReceived: patches, selfPatches, orderingViolations,
  server: {
    start: { rssMB: statsStart.rssMB, processed: statsStart.processed },
    mid: statsMid && { rssMB: statsMid.rssMB, processed: statsMid.processed, queueDepth: statsMid.queueDepth },
    end: {
      rssMB: statsEnd.rssMB, processed: statsEnd.processed, maxQueue: statsEnd.maxQueue,
      pubBackpressure: statsEnd.pubBackpressure, pubDropped: statsEnd.pubDropped,
      maxTxnMs: statsEnd.maxTxnMs, slowTxns: statsEnd.slowTxns, loopStalls: statsEnd.loopStalls,
      lastCheckpoint: statsEnd.lastCheckpoint,
    },
    rssHistory: statsEnd.rssHistory,
  },
}, null, 2));
process.exit(0);
