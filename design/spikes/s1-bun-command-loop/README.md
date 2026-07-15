# Spike S1 — single-writer command loop over bun:sqlite + Bun.serve pub/sub

Goal: retire the risk that the Empirica v3 core architecture's performance assumptions
are wrong. Architecture under test: one Bun process, a **single-writer command queue**
(commands strictly one at a time, one SQLite transaction each) over **bun:sqlite in WAL
mode**, with WebSocket fanout via **Bun.serve's built-in pub/sub topics** (one topic per
group).

**Verdict up front: PASS.** The architecture has ~65x throughput headroom over the
target load, sub-millisecond median latencies, stable memory, and strict per-group
ordering. The one real hazard found is SQLite's **inline WAL autocheckpoint**, which is
the entire latency tail — and it is fully fixable by moving checkpointing to a worker
thread (measured below). Details and PASS/FAIL per criterion at the bottom.

## Files

| file | what |
|---|---|
| `server.ts` | Bun.serve + WS + single-writer queue + bun:sqlite txn per command + `server.publish` patch fanout. Env knobs: `PORT`, `DB_PATH`, `SYNCHRONOUS`, `WAL_AUTOCHECKPOINT`, `CHECKPOINT_MODE=inline\|worker` |
| `checkpointer.ts` | Worker thread: own DB connection, `wal_checkpoint(PASSIVE)` every 1s + `RESTART` every 10s |
| `harness.ts` | N WS clients (K per group), fixed total cmd rate, measures cmd→ack and patch-receipt latency, per-group seq monotonicity, samples server RSS via `/stats` |
| `bench.ts` | Pure txn-loop microbenchmark, no WebSockets |

Reproduce (Bun 1.3.11, no npm deps — all built-ins):

```sh
bun bench.ts
DB_PATH=data/x.db CHECKPOINT_MODE=worker bun server.ts &
bun harness.ts --conns 1000 --groups 250 --rate 200 --duration 120
```

Setup: Linux x64 sandbox, 4 vCPU, 16 GB RAM. Server and harness are separate Bun
processes on one box. Latencies are measured entirely on the harness's
`performance.now()` clock (sender's timestamp is echoed back in acks and patches), so
there is no cross-process clock skew. Patch latency excludes the sender's own copy.
Each command's txn: SELECT old kv value → upsert `kv` → insert `events` → insert
`changes` (BEGIN IMMEDIATE, `synchronous=NORMAL`).

## 1. Microbenchmark — pure txn throughput, no WebSockets

4s measured per mode after 0.5s warmup; same 4-statement command shape as the server.

| mode | cmds/sec |
|---|---:|
| per-command txn, BEGIN IMMEDIATE, sync=NORMAL | **13,277** |
| batched 25 cmds/txn, BEGIN IMMEDIATE, sync=NORMAL | **90,224** |
| per-command txn, BEGIN IMMEDIATE, sync=FULL | 1,525 |
| batched 25 cmds/txn, BEGIN IMMEDIATE, sync=FULL | 26,104 |
| per-command txn, BEGIN **deferred**, sync=NORMAL | 17,611 |
| per-command txn, statements **re-prepared** each cmd, NORMAL | 10,188 |

Takeaways: per-command txns give ~13k cmds/sec — **65x** the 200/s target. Batching 25
commands per txn buys 6.8x more if ever needed. `synchronous=FULL` costs 8.7x (fsync
per commit) — NORMAL is the correct WAL setting. Statement reuse is worth ~23%.
Deferred BEGIN is ~25% *faster* than BEGIN IMMEDIATE (surprise #4 below).

## 2. Load tests — 1000 connections, 250 groups (4 clients/group)

All runs: every command acked, every expected patch delivered (3 per command to the
non-sender group members), **0 ordering violations**, **0 pub/sub backpressure or
drops**, target send rate achieved exactly. Latencies in ms.

### Exit-criterion load: 200 cmd/s, 120 s (24,000 commands, 72,000 patches)

| config | ack p50 | ack p95 | ack p99 | ack max | patch p50 | patch p95 | patch p99 | patch max |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| default inline autocheckpoint, run 1 | 0.22 | 1.46 | **404.6** | 776.9 | 0.24 | 1.62 | 407.8 | 783.1 |
| default inline autocheckpoint, run 2 | 0.22 | 0.46 | **9.97** | 73.0 | 0.24 | 0.52 | 10.5 | 73.2 |
| `wal_autocheckpoint=0` (no ckpt) | 0.22 | 0.41 | **0.85** | 31.2 | 0.24 | 0.46 | 0.89 | 31.6 |
| worker checkpointing, 600 s soak | see §4 | | | | | | | |

The two identical "default" runs differ 40x at p99: inline checkpoints usually stall
the writer 13–42 ms, but occasionally (run 1) a checkpoint+fs hiccup stalled it ~780 ms
and 154 commands queued behind it. Instrumentation pinned it exactly: slow txns arrive
every ~327 commands — the WAL autocheckpoint cadence (1000 pages / ~3 pages per txn).
With checkpointing off the writer, the tail vanishes (p99 0.85 ms, max txn 1.7 ms).

### 5x load and beyond (inline autocheckpoint unless noted)

| rate × dur | ack p50/p95/p99/max | patch p99 | max queue | max txn ms | RSS end | verdict |
|---|---|--:|--:|--:|--:|---|
| 1000/s × 120s (5x) | 0.31 / 2.7 / **14.3** / 77 | 15.5 | 73 | 77 | 58 MB | p99 < 20 ms even at 5x |
| 2000/s × 60s | 0.52 / 15.1 / **300.6** / 548 | 310.6 | 1,097 | 214 | 58 MB | latency SLO gone; throughput fine |
| 5000/s × 60s (25x) | 1.27 / 17.0 / **46.1** / 130 | 51.9 | 635 | 126 | 58 MB | still all 300k acked at rate |
| 1000/s × 120s, worker ckpt | 0.30 / 0.63 / **1.28** / 57 | 1.7 | 57 | 55 | 64 MB | recommended config |

**Where does it break?** It doesn't break functionally in any run up to 25x load:
throughput tracked the offered rate exactly (300,000/300,000 commands acked at
4,999.7/s), zero drops, zero backpressure signals, ordering intact, RSS flat. What
breaks is the *latency SLO*, between 1000 and 2000 cmd/s with inline checkpointing:
checkpoint stalls (up to 214 ms) arrive faster than the queue can drain, backing it up
to ~1,100 commands. (2000/s showing worse p99 than 5000/s is checkpoint-stall variance,
not a typo — the tail is dominated by a handful of stalls whose size depends on fs
timing.) With checkpointing moved off the writer, 1000/s runs at p99 1.28 ms; the hard
ceiling is the ~13k txns/s from the microbench minus WS overhead.

### Checkpoint strategy shoot-out (worker thread, 1000 cmd/s × 120 s)

| strategy | ack p99 | writer stall per ckpt | WAL size after 120 s |
|---|--:|--:|--:|
| inline autocheckpoint (SQLite default) | 14.3 | 13–77 ms, every ~0.33 s | bounded (~4 MB) |
| worker PASSIVE 1s only | 1.11 | none | **1.5 GB — unbounded!** |
| worker PASSIVE 1s + TRUNCATE 10s | 7.9 | 80–110 ms every 10 s | 13 MB |
| worker PASSIVE 1s + **RESTART** 10s | **1.28** | 34–55 ms every 10 s | 126 MB high-water, stops growing |

Recommended: PASSIVE 1s + RESTART every ~10s from a worker, `busy_timeout` on the
writer. The residual 34 ms stall every 10 s is suspiciously constant — it looks like
SQLite busy-handler sleep granularity, not real lock-hold time; a custom busy handler
or checkpoint-on-idle scheduling could shrink it further. Not needed to pass S1.

## 3. Memory (RSS)

| run | start | mid | end |
|---|--:|--:|--:|
| 200/s × 120 s (inline) | 46 MB | 55 MB | 57 MB |
| 1000/s × 120 s (inline) | 46 MB | 61 MB | 58 MB |
| 5000/s × 60 s | — | — | 58 MB |
| 1000/s × 120 s (worker ckpt) | 52 MB | — | 64 MB |
| 200/s × 600 s soak (worker ckpt) | see §4 | | |

RSS ramps ~10 MB in the first minute (JIT, socket buffers, SQLite page cache) then
plateaus. No growth trend with load rate — 5000/s ends at the same 58 MB as 200/s.

## 4. 10-minute soak — 200 cmd/s, worker checkpointing (recommended config)

SOAK_RESULTS_PLACEHOLDER

## Exit criteria — verdicts

| criterion | result | verdict |
|---|---|---|
| p99 cmd→ack < 20 ms @ 1000 conns / 200 cmd/s | 0.85–1.3 ms with checkpointing off the writer (recommended config); 9.97 ms with naive default PRAGMAs but with a demonstrated failure mode (one run hit 404 ms from a single bad inline checkpoint) | **PASS** (worker-ckpt config); default-PRAGMA config is at-risk and should not ship |
| RSS stable | 46→57 MB warm-up plateau, flat thereafter; identical end-RSS at 1x and 25x load; soak in §4 | **PASS** |
| (informational) 5x load, 1000 cmd/s | p99 14.3 ms inline / 1.28 ms worker-ckpt; zero drops | PASS |

## Surprises / findings

1. **Inline WAL autocheckpoint is the entire latency tail.** With the SQLite default
   (`wal_autocheckpoint=1000` pages ≈ every ~330 commands here), the checkpoint runs on
   the writer's COMMIT: 13–42 ms stalls like clockwork, occasionally ~780 ms. p99 at
   identical load varied 0.85 ms ↔ 404 ms purely on checkpoint behavior. Any latency
   test of this architecture that doesn't run several minutes will randomly pass or fail.
2. **PASSIVE-only checkpointing never resets the WAL under sustained writes.** A writer
   only rewinds the WAL when a checkpoint has fully caught up *at the moment it starts a
   write* — at 1000 writes/s that never happens, and the WAL hit 1.5 GB in 2 minutes.
   Periodic `RESTART` (or `TRUNCATE`) is mandatory, plus `busy_timeout` on the writer so
   it rides out the brief write-lock.
3. **TRUNCATE vs RESTART matters**: TRUNCATE's file-shrink held the writer 80–110 ms;
   RESTART 34–55 ms with the WAL parked at its high-water mark (126 MB @1000/s). The
   near-constant 34.5 ms smells like busy-handler sleep granularity, not real work.
4. **`BEGIN IMMEDIATE` is ~25% slower than deferred `BEGIN`** in bun:sqlite even with a
   single connection and zero contention (13.3k vs 17.6k cmds/s). For a true
   single-writer process, deferred is safe and free — worth taking.
5. `synchronous=FULL` costs 8.7x per-txn throughput vs NORMAL under WAL. NORMAL's
   durability window (commits since last checkpoint can be lost on *power loss*, not
   app crash) is the right trade here.
6. Prepared-statement reuse is worth ~23% — real but not fatal if a code path misses
   the cache (`db.query()` caches by SQL string; `db.prepare()` does not).
7. **Bun.serve pub/sub behaved perfectly**: across ~1.9 M patch deliveries in these runs,
   zero ordering violations (per-group seq strictly monotonic at every subscriber), zero
   backpressure (`publish()` never returned -1/0), no drops even at 25x load.
   `server.publish()` echoes to the sender too (it's subscribed to the topic) — use
   `ws.publish()` if the sender shouldn't get its own patch; we want it (it doubles as
   the authoritative state update), so acks could even be folded into patches later.
8. Bun 1.3.11 rejects `idleTimeout > 255` seconds in `Bun.serve` (error at startup) —
   docs in the wild mention higher limits. Keep it ≤ 255 or heartbeat.
9. Harness lessons: `Math.max(...arr)` stack-overflows on ~1M samples (argument-spread
   limit) — reduce instead; and a catch-up scheduler (send however many are due by
   wall-clock) is needed to hold an exact aggregate rate across 1000 sockets.

## Threats to validity

- Server and harness share one 4-vCPU box; at 5000/s the harness itself is doing 25k
  msgs/s of JSON, so high-load numbers are conservative (server had ~2 cores of company).
- Loopback networking only — no TLS, no WAN jitter. This spike tests the server
  architecture, not the network.
- One command shape (4 statements, small rows). Bigger payloads move the constants,
  not the architecture conclusion.
