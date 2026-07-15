# Spike S7 — the Bun exit door: S1's engine on Node 22 behind a platform seam

Goal: prove the v3 engine's platform seam is real — that the S1 architecture
(single-writer command loop over SQLite WAL + WS pub/sub fanout) swaps from
Bun (bun:sqlite + Bun.serve) to Node LTS (better-sqlite3 + ws) **without
architectural change**, at acceptable performance.

**Verdict up front: PASS.** The S1 server ported onto a ~180-line seam
implementation with zero changes to the command loop, txn shape, queue, or
checkpoint strategy. Functional parity is exact (all commands acked at rate,
zero drops, zero ordering violations across 1.33M patch deliveries, same echo
semantics). Performance is at parity at the target load — ack p99 **0.63 ms**
at 1000 conns / 200 cmd/s vs Bun's 0.84–0.85 — and within ~1.4x of Bun
everywhere that matters. Even the failure modes reproduce identically (inline
autocheckpoint stall cadence, WAL high-water mark to the megabyte).

## Files

| file | what |
|---|---|
| `seam.ts` | **The platform seam** (types only): `SqliteDriver` (exec/prepare/transaction), `WsServer` (publish/metrics) + `PlatformSocket` (send/subscribe), `PublishResult` |
| `platform-node.ts` | Node implementation: better-sqlite3 driver passthrough; ws + node:http server with topic→`Set<socket>` map, serialize-once TEXT-frame fanout; worker_threads checkpointer launcher |
| `server.ts` | S1's server.ts ported onto the seam — command loop, queue, stats, PRAGMAs, env knobs all line-for-line. Only platform import: `platform-node.ts` |
| `checkpointer.ts` | S1's worker checkpointer on worker_threads + better-sqlite3 (PASSIVE 1s / RESTART 10s) |
| `bench.ts` | S1's microbenchmark, same six modes, same 0.5s warmup / 4s measure |
| `harness.ts` | **S1's harness verbatim** (only default-port literal changed), still run under Bun — same load generator against both backends |
| `run-*.json` | Raw harness output for every run below |

Reproduce (Node 22.22.2, Bun 1.3.11 for the harness):

```sh
npm install                      # better-sqlite3 ^12, ws ^8; see friction notes
/opt/node22/bin/node bench.ts    # .ts runs natively: type stripping is default since 22.18
DB_PATH=data/x.db CHECKPOINT_MODE=worker /opt/node22/bin/node server.ts &
bun harness.ts --conns 1000 --groups 250 --rate 200 --duration 120
```

Setup: same 4 vCPU / 16 GB Linux x64 sandbox as S1, loopback, harness and
server as separate processes. Methodology copied from S1 exactly: same txn
shape (SELECT old kv → upsert kv → insert events → insert changes, BEGIN
IMMEDIATE, synchronous=NORMAL), same harness clock (sender's
`performance.now()` echoed in acks/patches), same recommended config (worker
checkpointer PASSIVE 1s + RESTART 10s, `wal_autocheckpoint=0`, `busy_timeout`
on the writer). The harness stays on Bun deliberately: the exit door is about
the **server**, and holding the load generator constant isolates the
server-side delta.

## The seam (as implemented)

```ts
interface SqliteStmt<Row>  { get(...a): Row | null | undefined; run(...a): void; all(...a): Row[] }
interface SqliteTxn<A, R>  { (...a: A): R; immediate(...a: A): R }        // call = BEGIN (deferred)
interface SqliteDriver     { exec(sql): void; prepare<Row>(sql): SqliteStmt<Row>;
                             transaction(fn): SqliteTxn; close(): void }   // prepare is UNCACHED by contract

interface PlatformSocket<Ctx> { data: Ctx; send(msg: string): void; subscribe(topic: string): void }
interface PublishResult    { queued: number; backpressure: number; dropped: number }
interface WsServerOptions  { port; context(url): Ctx; http?(url): object | undefined;
                             open?(s); message(s, raw: string); close?(s) }
interface WsServer<Ctx>    { publish(topic, msg: string): PublishResult;
                             metrics(): { maxBufferedAmount; sendErrors }; stop(): void }
```

Both native APIs already agree on the hard part: better-sqlite3's `Statement`
(.get/.run/.all) and `Transaction` (callable + `.immediate`) satisfy the seam
**as-is** — bun:sqlite copied better-sqlite3's API — so the Node driver is a
passthrough and a future `platform-bun.ts` is ~60 lines. The WS half is where
the seam earns its keep: Bun has built-in topics, ws has none, so the seam owns
the topic map, the serialize-once fanout, the echo policy, and the
backpressure signal (details under "behavioral differences").

## 1. Microbenchmark — pure txn throughput, no WebSockets (cmds/sec)

| mode | S1 Bun | S7 Node | Node/Bun |
|---|--:|--:|--:|
| per-command txn, BEGIN IMMEDIATE, sync=NORMAL | 13,277 | **14,439** | **+8.8%** |
| batched 25/txn, BEGIN IMMEDIATE, sync=NORMAL | 90,224 | 83,003 | −8.0% |
| per-command txn, BEGIN IMMEDIATE, sync=FULL | 1,525 | 1,478 | −3.1% |
| batched 25/txn, BEGIN IMMEDIATE, sync=FULL | 26,104 | 25,755 | −1.3% |
| per-command txn, BEGIN (deferred), sync=NORMAL | 17,611 | 16,371 | −7.0% |
| per-command txn, re-prepared stmts each cmd, NORMAL | 10,188 | 7,881 | **−22.6%** |

SQLite-bound modes are a wash (±9%); Node is even *faster* on the headline
per-command number. The one real gap is statement **re-preparation** (−23%):
better-sqlite3's `prepare()` builds a heavier Statement object, and unlike
bun's `db.query()` there is no built-in SQL-string cache. With the engine's
prepare-once pattern (the seam's contract) this gap is invisible. S1's
deferred-faster-than-IMMEDIATE surprise reproduces on Node (16.4k vs 14.4k).

## 2. Load tests — 1000 connections, 250 groups, latencies in ms

Every S7 run: all commands acked, exact target rate achieved, expected patch
count delivered (3 per command to non-sender group members + 1 self-echo),
**0 ordering violations, 0 backpressure, 0 drops, 0 send errors**.

### Exit-criterion load: 200 cmd/s × 120 s, recommended (worker-ckpt) config

| | ack p50 | ack p95 | ack p99 | ack max | patch p99 | maxQueue |
|---|--:|--:|--:|--:|--:|--:|
| S1 Bun (`wal_autocheckpoint=0`, 120 s) | 0.22 | 0.41 | 0.85 | 31.2 | 0.89 | — |
| S1 Bun (worker ckpt, **600 s** soak) | 0.21 | 0.37 | 0.84 | 119.1 | 0.89 | 20 |
| **S7 Node (worker ckpt, 120 s)** | 0.25 | 0.39 | **0.63** | 38.7 | 0.70 | 10 |

p99 **0.63 ms — 31x under the 20 ms budget**, and (within run-to-run variance)
at or better than Bun's number. Slow txns: 5, all 19–35 ms, all on the 10 s
RESTART cadence — S1's exact signature (34–55 ms).

### 5x load: 1000 cmd/s × 120 s, worker ckpt

| | ack p50 | ack p95 | ack p99 | ack max | patch p99 | maxQueue | max txn | WAL high-water |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| S1 Bun | 0.30 | 0.63 | 1.28 | 57 | 1.7 | 57 | 55 | 126 MB |
| **S7 Node** | 0.52 | 1.01 | **1.71** | 57 | 1.78 | 58 | 55 | **126.5 MB** |

Node carries ~0.2 ms more per-message overhead at this rate (p50 0.52 vs
0.30 — JSON in/out through ws + Buffer.toString per message), but p99 is 1.7x
under even S1's 20 ms *criterion*, and max/maxQueue/max-txn/WAL numbers are
carbon copies of Bun's. ws user-space buffering never engaged
(`maxBufferedAmount` stayed 0 all run).

### Behavior-parity runs (default inline autocheckpoint — the config S1 rejects)

| | ack p50 | ack p95 | ack p99 | ack max | note |
|---|--:|--:|--:|--:|---|
| S1 Bun 200/s × 120 s (2 runs) | 0.22 | 0.46 | 9.97 / **404.6** | 776.9 | stall every ~327 cmds |
| **S7 Node 200/s × 120 s** | 0.25 | 0.41 | **6.71** | 40.9 | stalls every ~250–330 cmds, 16–40 ms |
| S1 Bun 5000/s × 60 s | 1.27 | 17.0 | 46.1 | 130 | 300k/300k acked |
| **S7 Node 5000/s × 60 s** | 2.89 | 17.8 | **54.1** | 111.9 | 300k/300k acked @ 4999.6/s |

The inline-autocheckpoint latency tail — S1's headline finding — reproduces on
Node with the same cadence and magnitude. Node's 25x run holds functional
parity (zero violations at 5000/s) at ~1.2x Bun's p99. (A worker-ckpt 5000/s
probe also stayed functionally perfect — 300k/300k @ 4999.8/s, 0 violations —
but RESTART stalls grow with WAL frame count at that write rate: p99 160 ms,
max 252 ms. S1 has no comparable row; at 25x load with either config the
latency SLO is gone on both runtimes, as S1 found between 1000 and 2000/s.)

### Throughput ceiling

Microbench ceiling: ~14.4k per-command txns/s (Node) vs ~13.3k (Bun); batched
ceiling 83k vs 90k. Functional ceiling under WS load: like S1, **it did not
break functionally in any run up to 25x** — 300,000/300,000 acked at
4,999.8/s with ordering intact. The latency SLO dies somewhere above 1000/s,
same as on Bun.

## 3. Memory (RSS) — the one real gap

| checkpoint | S1 Bun | S7 Node |
|---|--:|--:|
| runtime baseline (hello world) | — | 45 MB |
| + better-sqlite3 + ws loaded | — | 62 MB |
| server idle (worker ckpt = +1 V8 isolate) | ~46–52 MB | ~120 MB |
| end of 200/s × 120 s | 57–61 MB | 159 MB |
| end of 1000/s × 120 s (worker) | 64 MB | 163 MB (peak 180, GC'd to 150s) |
| end of 5000/s × 60 s | 58 MB | 160–182 MB |

Node runs **~2.6x Bun's RSS** (~100 MB extra): V8 baseline is heavier than
JSC's, and the worker_threads checkpointer costs ~55 MB for its own isolate
(Bun workers are far lighter). But the *shape* matches S1: ramp during the
first minute, then plateau — no growth trend with load rate or duration, and
the 200/s and 5000/s runs end within 25 MB of each other. It's a constant
tax, not a leak. If 100 MB matters, the checkpointer can be a child process
(~50 MB Node floor) or a setInterval on a second in-process connection
(PASSIVE is non-blocking by design; only the 10 s RESTART briefly needs the
loop — measured 0.1–3 ms per PASSIVE tick here).

## 4. Behavioral differences: ws vs Bun.serve

- **Pub/sub is DIY.** ws has no topics. The seam implements topic →
  `Set<socket>`, with the patch string encoded to a Buffer **once** per
  publish and sent to every subscriber as a TEXT frame
  (`ws.send(buf, { binary: false })`). Server→client frames are unmasked, so
  ws never transforms the shared payload per socket. This performed at parity
  (patch p99 0.70 ms for 3-way fanout at 200/s).
- **Publish-echo is seam policy, not runtime behavior.** S1 noted Bun's
  `server.publish()` echoes to a subscribed sender while `ws.publish()`
  excludes it. On Node *we* decide: the sender is in its group's Set, so it
  gets its own patch — matching `server.publish()`. Verified: selfPatches ==
  commands sent in every run. The real seam should expose `publish(topic, msg)`
  and `publishExcept(sock, topic, msg)`; both map 1:1 to Bun's two calls and to
  a `if (ws === skip) continue` on Node.
- **Backpressure signal differs in kind.** Bun's `publish()` returns
  −1/0/bytes; ws exposes per-socket `bufferedAmount` after a queued send. The
  seam returns `{queued, backpressure, dropped}` with a 1 MiB high-water mark
  on Node. In practice neither signal ever fired in either spike:
  `maxBufferedAmount` stayed **0** in every S7 run — writes drained to the
  kernel socket buffer immediately, even at 25k msgs/s fanout.
- **Ordering held.** ws's per-socket send queue is FIFO; across ~1.33M patch
  deliveries in these runs, per-group seq was strictly monotonic at every
  subscriber (0 violations), matching Bun's ~3M-delivery record in S1.
- **Message delivery type**: ws hands the `message` handler a Buffer even for
  TEXT frames (Bun hands a string), so the seam pays a `toString()` per
  inbound message. Visible as ~+0.2 ms p50 at 1000/s; irrelevant at target load.
- **Idle timeout**: Bun requires `idleTimeout ≤ 255 s` (S1 surprise #8); ws
  has *no* idle timeout and Node's http timeouts don't apply post-upgrade. A
  production seam needs app-level ping/pong on Node. Non-issue under constant
  spike traffic.
- **perMessageDeflate** is off by default in ws (and set off explicitly) —
  same as Bun. No compression anywhere in either spike.

## 5. DX / compat friction (honest list)

1. **Install**: `npm install` (better-sqlite3 12.11.1 + ws 8.21.1, 39 packages)
   took **93 s**, ~87 s of it compiling better-sqlite3 from source: through
   this sandbox's agent proxy, prebuild-install's GitHub-release download gets
   **HTTP 403**, and npm falls back to `node-gyp rebuild` (verified by rerunning
   `prebuild-install --verbose`). The compile worked first try (python 3.11,
   gcc, make all present — node-gyp needs them), exit 0, no retries needed. On
   unproxied networks the prebuilt binary makes this seconds. Ops note: native
   builds must be possible in CI images, or vendor the prebuild. ws is pure JS.
2. **Node runs `.ts` natively now**: type stripping is on by default in Node
   22.18+ (this box: 22.22.2) — main modules *and* worker_threads workers ran
   unmodified with **zero warnings**. Constraints: erasable-syntax only (no
   enums/namespaces), explicit `.ts` import extensions. No tsx/ts-node needed.
3. **API deltas the real seam must absorb** (bun:sqlite vs better-sqlite3):
   - `db.query()` (cached by SQL string) is bun-only; better-sqlite3 has only
     uncached `prepare()`. Seam contract: prepare-once, engine owns statement
     lifetimes. (Miss this and you eat the −23% re-prepare penalty, or add an
     LRU in the driver.)
   - `.get()` with no row: bun returns `null`, better-sqlite3 `undefined`.
     Engine code must use `??`/`?.`, never `=== null`. (S1's code already did.)
   - int64: bun `new Database(p, {safeIntegers})` + `stmt.safeIntegers()`;
     better-sqlite3 `db.defaultSafeIntegers()` + `stmt.safeIntegers()`. Neither
     spike needed BigInts (seq < 2^53), but the seam must pick one policy.
   - PRAGMA-with-result API: bun `db.query("PRAGMA ...").get()`; better-sqlite3
     `db.pragma("...")` (used in the checkpointer) — though `prepare("PRAGMA
     wal_checkpoint(PASSIVE)").get()` works there too. Plain `exec("PRAGMA ...")`
     works on both and is all the seam exposes.
   - Constructor: bun needs `{create: true}`; better-sqlite3 creates by default
     and sets `busy_timeout=5000` by default (`timeout` option) — set PRAGMAs
     explicitly on both so behavior is declared, not inherited.
   - Strictness: better-sqlite3 throws on binding `undefined` or booleans;
     bun coerces booleans. Keep bindings string/number/null (S1 shape already is).
   - Bundled SQLite: 3.53.2 (better-sqlite3 12.11.1) vs 3.51.2 (Bun 1.3.11).
     Same WAL/checkpoint semantics observed — identical stall cadences and WAL
     high-water marks. Version skew is a real (if minor) compat surface.
4. **Workers differ more than sockets or SQLite**: Bun uses the web Worker API
   (`onmessage`/`postMessage` globals), Node uses `worker_threads`
   (`parentPort.on("message")`), and a Node worker costs ~55 MB RSS. The
   checkpointer is 25 lines per platform — fine as a per-platform file behind
   `startCheckpointer()` in the seam.
5. Small renames: `import.meta.dir` (Bun) → `import.meta.dirname` (Node
   ≥20.11); `Bun.sleep` → `setTimeout` promise; `Response.json` (Bun fetch
   handler) → plain `res.end(JSON.stringify(...))` behind the seam's `http`
   hook. All confined to platform code.
6. Gotcha for future soaks: Node's default `http` server is fine for 1000
   upgrades, but check `ulimit -n` (4096 here) before scaling connections.

## Exit criterion (design doc 14) — verdict

| criterion | result | verdict |
|---|---|---|
| Same suite green on Node LTS | S1 server/bench/harness ported behind the seam; engine logic unchanged; all runs completed | **PASS** |
| Functional parity @ 200 cmd/s: zero drops / ordering violations | 24,000/24,000 acked at exactly 200/s; 72,000/72,000 patches + 24,000/24,000 self-echoes; 0 drops, 0 backpressure, 0 ordering violations (and 0 in every other run up to 5000/s) | **PASS** |
| p99 < 20 ms at target load (1000 conns / 200 cmd/s) | **0.63 ms** (worker-ckpt config) — 31x under budget; even the rejected inline-default config passes at 6.7 ms | **PASS** |
| Quantify the Bun gap | txn throughput ±9% (Node faster per-command); p50 +0.0–0.2 ms; p99 0.75x–1.4x Bun across runs; RSS **2.6x** (~+100 MB constant, flat); install 93 s w/ source compile vs zero-dep Bun | quantified |

## Threats to validity

- Same shared-box caveats as S1 (harness competes for the 4 vCPUs at high
  rates; loopback only; one command shape).
- The harness ran under Bun with `--smol` (session default via `BUN_OPTIONS`);
  it only affects the *client* process, and at 200–1000/s the harness is
  nowhere near limits, but 5000/s client-side numbers are conservative on
  both spikes.
- 120 s runs per the S7 test matrix vs S1's 600 s headline soak; S1 showed
  the tail risk is checkpoint-cadence-driven and S7 runs cover 12+ RESTART
  cycles each, but a 10-min Node soak is cheap insurance before v3 commits.
- better-sqlite3 was compiled from source here; prebuilt binaries are the
  common path and should be byte-equivalent in behavior, not re-verified.

**Bottom line: the exit door is real and cheap.** One ~180-line platform file
plus a 25-line worker is the entire Bun surface. Same architecture, same
config, same failure modes, same functional guarantees; sub-millisecond p99 at
the target load on both runtimes. Costs of walking through it: ~100 MB RSS,
~0.2 ms p50 at 5x load, and a native-module build step.
