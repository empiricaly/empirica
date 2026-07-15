# Spike S3 — Litestream crash drill (SQLite backup story)

**Question.** Can litestream replicate a WAL-mode SQLite DB under continuous
writes, survive `kill -9` of both writer and replicator, restore from the
replica, and keep the committed-transaction loss gap small and bounded? Does
point-in-time restore (PITR) work?

**Verdict: PASS.** Point-in-time restore works (over the real S3 protocol and
over `file://`). The committed-loss gap is bounded and measured: **47–60 txns
(~0.9–1.2 s at ~50 txn/s)** when the replicator dies, **0** when only the
writer dies, in every run, on both transports. The gap is opened by the
*replicator's* death, not the writer's, and it grows linearly for as long as
the replicator stays dead while the primary keeps committing (measured: +5 s
outage → 291-txn gap). Litestream's guarantee is **bounded loss
(≈ sync-interval + in-flight upload)**, not zero loss — the drill confirms
exactly that.

## Setup

Environment note: the session egress proxy 403-blocks GitHub (release
downloads included: `{"message":"GitHub access to this repository is not
enabled for this session..."}`), and Docker is unavailable. Workarounds, no
external accounts needed:

- **litestream v0.3.13** — latest 0.3.x stable with a distributable release
  binary. Two builds used, results identical:
  - official release binary (linux-amd64), obtained via the fly.io npm repack
    `@flydotio/litestream-linux-x64@1.0.1` (registry.npmjs.org is
    allowlisted); `litestream version` → `v0.3.13`. Used for all s3:// runs.
  - `go install github.com/benbjohnson/litestream/cmd/litestream@v0.3.13`
    via allowlisted `proxy.golang.org` (prints `(development build)` but is
    the v0.3.13 tag). Used for the file:// runs.
- **MinIO** (S3-compatible object store, no external account): built from
  source, `go install github.com/minio/minio@latest` via `proxy.golang.org`
  (master @ `7aac2a2c` 2026-02-12). Single-node single-drive on
  `127.0.0.1:9000`, bucket `empirica` created with `curl --aws-sigv4`.
- **Writer**: Bun 1.3.11 (`bun:sqlite`), WAL mode, `synchronous=FULL`,
  ~50 txn/s (measured 49–54), one row per txn with a monotonic counter.
  After each COMMIT the counter is appended to a side log and **fsync'd** —
  the committed ground truth. Because logging happens after COMMIT, the log
  can undercount the true committed max by at most 1 (observed twice:
  crashed DB held ground-truth+1). Bias is conservative for loss reporting.
- `sync-interval: 1s` (litestream default, set explicitly in both configs).

Files here:

| file | purpose |
|---|---|
| `writer.ts` | continuous-write workload + fsync'd committed-counter log |
| `check.ts` | prints max(counter), row count, contiguity, integrity_check |
| `verify.ts` | standalone verifier (same checks, camelCase JSON) |
| `litestream.template.yml` | config template, `file://` replica |
| `litestream-s3.template.yml` | config template, `s3://` replica (MinIO) |
| `run-drill.sh` | one file-replica drill: run → kill -9 → restore → measure |
| `run-drill-s3.sh` | same against MinIO; adds `ls-dead-linger` kill mode |
| `pitr-s3.sh` | 90 s run, then `restore -timestamp <T_mid>` + latest restore |

## Results — crash drills

Each run: writer + `litestream replicate` for ~60 s (kill at a random moment),
`kill -9`, `litestream restore` to a fresh path, compare `max(counter)` in the
restored DB vs the last fsync'd committed counter. Raw logs:
`scratchpad/s3/{s3drill,drill}/results.txt` (session-local, disposable).

**Real S3 protocol (MinIO), official v0.3.13 binary:**

| run | kill order | writes ran | committed | restored | **gap (txns)** | gap (s @ measured rate) | restored DB |
|---|---|---|---|---|---|---|---|
| s-smoke | simultaneous | 10 s | 533 | 486 | **47** | ~0.9 s | ok, contiguous |
| s1 | litestream first (+0.25 s writer) | 61 s | 3030 | 2970 | **60** | ~1.2 s | ok, contiguous |
| s2 | writer first (+0.25 s litestream) | 61 s | 3013 | 3013 | **0** | 0 | ok, contiguous |
| s3 | simultaneous | 61 s | 3018 | 2971 | **47** | ~0.95 s | ok, contiguous |
| s4 | litestream killed, writer commits **5 s more** | 68 s | 3356 | 3065 | **291** | ~5.9 s | ok, contiguous |

**`file://` replica (same engine/format, local dir), go-install build:**

| run | kill order | writes ran | committed | restored | **gap (txns)** | gap (s) | restored DB |
|---|---|---|---|---|---|---|---|
| f-smoke | simultaneous | 8 s | 435 | 388 | **47** | ~0.9 s | ok, contiguous |
| f1 | litestream first | 53 s | 2623 | 2564 | **59** | ~1.2 s | ok, contiguous |
| f2 | writer first | 58 s | 2859 | 2859 | **0** | 0 | ok, contiguous |
| f3 | simultaneous | 48 s | 2373 | 2326 | **47** | ~0.95 s | ok, contiguous |

Observations:

- **The measured loss bound is ~1×–1.2× sync-interval** (47–60 txns at
  ~50 txn/s with `sync-interval: 1s`): the un-shipped tail is whatever
  committed since the last 1 s sync, plus kill-timing jitter. Identical
  behavior over real S3 API and file transport (LAN MinIO upload latency
  ~7 ms is negligible; real-WAN S3 adds its latency to the window).
- **Which death causes the gap: the replicator's.** Writer killed first →
  litestream (surviving 0.25 s) shipped the tail → gap 0, both transports.
  Litestream killed while the writer keeps committing → every later txn is
  lost on restore: 5 s of replicator outage → 291-txn gap (≈ 5 s + ~0.9 s
  pre-death lag). Loss window = time since the replicator last synced.
- Restored DBs pass `PRAGMA integrity_check` and are contiguous (row count ==
  max counter, no holes) in every run: you lose a clean *suffix*, never a
  torn txn or a random subset.
- The crashed **local** DB, reopened after `kill -9`, contained **all**
  committed txns every time (SQLite WAL recovery works). The gap is purely
  replication lag — losing the machine/volume is the scenario that costs you
  the tail, and that is exactly the case backup exists for.

## Result — point-in-time restore

`litestream restore -timestamp <RFC3339>` to a mid-run instant, compared
against the fsync'd log's counter at that wall-clock moment:

| transport | target instant | committed counter at instant | PITR-restored max | delta behind target | restored DB |
|---|---|---|---|---|---|
| s3 (MinIO), 90 s run | 06:42:53Z (T+45 s) | 2215 | 2186 | **29 (~0.6 s)** | ok, contiguous |
| file, 53 s run | 06:29:14Z (T+26 s) | 1303 | 1259 | **44 (~0.9 s)** | ok, contiguous |

PITR lands at the last WAL segment *uploaded* at/before the timestamp — i.e.
up to one sync-interval **behind** the requested instant, never ahead, and
always a consistent committed prefix. (Reference: latest-restore of the same
s3 replica gave 4372 of 4420 committed — the usual ~1 s gap.) PITR
granularity ≈ sync-interval; window ≈ `retention` (default 24 h).

## Flags that matter

- **`sync-interval`** (per replica, default `1s`): THE knob bounding the loss
  window. Worst-case loss ≈ sync-interval + one in-flight upload. Lowering it
  tightens RPO at the cost of more, smaller PUTs (S3 request cost).
- **`snapshot-interval`** / **`retention`** (default 24 h): snapshot cadence
  bounds restore time (restore = snapshot + WAL replay); retention bounds how
  far back PITR can reach before segments are pruned.
- `restore -timestamp RFC3339` (PITR), `-generation`, `-index`; `restore -o
  PATH` refuses to overwrite an existing file (verified) — restore to a fresh
  path, then move into place.
- Metrics: **top-level `addr: ":9090"` in the config** exposes Prometheus
  `/metrics` (there is no `-metrics` flag in v0.3.13; verified against the
  binary).
- Throughput note: 50 single-row txn/s shipped ~600 KB/s of WAL (each tiny
  commit dirties whole 4 KB pages). Budget replica bandwidth by page churn,
  not logical row size; batching writes into larger txns shrinks it
  dramatically.

## Production runbook (draft)

**Monitoring replication lag** (metric names verified on v0.3.13):

- Lag in WAL positions: `litestream_shadow_wal_index` /
  `litestream_shadow_wal_size` (produced locally) vs
  `litestream_replica_wal_index` / `litestream_replica_wal_offset` (shipped).
  Alert when the replica position stops advancing while shadow advances.
- Errors: rate of `litestream_sync_error_count` > 0;
  `litestream_replica_validation_total{status="error"}` if validation is on.
- Liveness: alert if the litestream process is down at all — the DB keeps
  working and the loss window grows silently (drill s4 measured this
  directly: gap = outage duration + sync lag).

**Restore steps (disaster):**

1. Stop anything that might write the DB path.
2. `litestream restore -config litestream.yml -o /data/app.db.new /data/app.db`
   (add `-timestamp <RFC3339>` to land before a bad deploy/migration).
3. Verify before serving: `PRAGMA integrity_check`; check `max(seq)` /
   app-level ground truth; for PITR remember the result can be up to one
   sync-interval behind the requested instant.
4. Move the restored file into place; delete stale `-wal`/`-shm` files from
   the dead instance; start litestream (it begins a new generation) *before*
   the app opens the DB for writes; then start the app.

**Boot-after-restore (engine requirement — feeds the sync design):**

A restore can land *behind* what clients have observed: any client that saw
seq N committed in the ~1 s before the crash may hold cursors ahead of the
restored DB's max seq. The engine MUST treat the restored DB as
authoritative:

- On boot, read `max(seq)` and advertise it as the server high-water mark.
- A client cursor > restored max(seq) is stale-from-the-future: reject it and
  force **snapshot-resume** (full resync from restored state), never
  incremental catch-up — otherwise clients silently diverge on seqs that no
  longer exist or get reassigned to different transactions post-restore.
- Practical mechanism: stamp a restore epoch (litestream generation id, or an
  epoch bumped at every boot-from-restore) into every cursor; epoch mismatch
  ⇒ snapshot-resume.

## Caveats

- **Local MinIO ≠ AWS S3 in failure behavior.** The S3 *protocol* path is
  exercised for real (SigV4, path-style PUT/GET/LIST, lz4 WAL segments in
  the bucket — verified object layout), but WAN latency adds to the loss
  window, and under S3 throttling/outage lag grows unboundedly while the
  primary keeps committing — which is why lag monitoring is non-optional.
  Credential expiry and multipart edge cases were not exercised.
- **Zero loss is NOT the guarantee.** Bounded loss is: sync-interval +
  in-flight upload, opened by replicator death. Writer death alone loses
  nothing if the replicator gets even a beat to flush (measured gap 0).
- `kill -9` tests process death, not power loss / fs corruption on the
  primary (irrelevant to replica-side correctness — the replica is remote —
  but local WAL durability under power loss depends on `synchronous` and the
  storage stack honoring fsync).
- Ground-truth log can undercount the true committed max by 1 (log write is
  after COMMIT); observed twice. Reported gaps are accurate to ±1 txn.
- Single litestream instance per DB (it needs exclusive checkpoint control);
  litestream restart after unsynced checkpoints starts a *new generation* —
  restore picks the newest generation automatically, but PITR across a
  generation boundary is limited to that generation's window.
- Provenance: production should pin the official release binary/container
  (the go-install litestream reports `(development build)`; the MinIO used
  here is a master build, `DEVELOPMENT.GOGET`).
- v0.3.13 is the latest 0.3.x with distributed release binaries (a v0.3.14
  git tag exists upstream, unreleased). Upstream now also has a reworked
  0.5.x line — re-evaluate before production adoption, this spike proves the
  0.3.x stable line only.

## Exit criterion (from the design doc)

> Point-in-time restore works; committed-loss gap is bounded and measured
> (report the bound).

- PITR to a mid-run timestamp over real S3: valid, consistent DB at 29 txns
  (~0.6 s) behind the requested instant; file replica: 44 txns (~0.9 s).
  **Met.**
- Loss gap measured across 3+ kill permutations × 2 transports: 47–60 txns
  (~0.9–1.2 s) with replicator death, 0 with writer-only death, linear growth
  with replicator outage (291 txns for a 5 s outage). **Bound ≈ sync-interval
  (1 s) + in-flight upload + outage duration. Met.**

**PASS.**
