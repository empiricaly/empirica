# Spike S5 — Yjs collab fields over an opaque journal

**Verdict: PASS.** The opaque-relay model fully supports replay, scrub, and compaction.
The exit criterion — keystroke-level scrub of a shared essay reconstructed purely from
the journal — works: 10 arbitrary seq points, no crashes, every prefix a complete doc
state, final scrub identical to the live docs.

## What was built

Single Bun process simulating two Y.Doc clients + a relay server (`spike.ts`):

- Server appends every Yjs update blob to `collab_updates(seq INTEGER PRIMARY KEY, blob BLOB)`
  in `bun:sqlite` and relays it to the other client. It never parses a blob.
- Session on one shared `Y.Text`: 577 journaled updates covering interleaved typing at
  different positions, same-position conflicting inserts (block and keystroke level),
  deletes incl. a concurrent insert into a deleted range, and an offline period synced
  back via `Y.encodeStateVector` + diff updates. Post-compaction editing brings the
  grand total to 668 blobs.
- A `pause()/flush()` network mode creates genuine concurrency (neither client sees the
  other's edits until flush).

Run it: `bun install && bun run spike.ts` (creates throwaway DBs under `data/`).

## Results

| Test | Result |
|---|---|
| Convergence (A === B) after every phase | PASS |
| **Replay**: fresh doc + all 577 blobs in seq order === live text | PASS (11 ms) |
| **Scrub**: 10 arbitrary seq points, in-order prefix replay | PASS (3.6 ms/point avg) |
| Scrub prefixes leave zero pending structs; state vectors monotonic | PASS |
| **Compaction**: snapshot at seq 337 (built by replaying journal prefix), DELETE ≤ 337, keep editing; snapshot + tail replay === live | PASS |
| Full-set shuffle: 5 random orders of all 577 blobs converge, no pending | PASS |
| Shuffled 50% *prefix*: pending structs, doc stuck at len 1 | Expected failure mode (see ordering) |
| `[snapshot, ...tail]` shuffled still converges | PASS |
| Bonus Y.Map whiteboard (70 blobs, concurrent same-key sets): converge, replay, shuffle | PASS |

## Numbers

- **Update blob size** (668 blobs, Y.Text): avg **12.5 B**, median 12 B, min 6 B, max 100 B.
- **Journal growth per keystroke**: **13.0 B** (measured over 240 single-char inserts).
  ~1 KB per 80 keystrokes; a 5-minute two-person typing burst ≈ tens of KB. Fine for sqlite.
- **Offline catch-up diffs**: peer→returning client 100 B, returning client→server 65 B
  (46 offline keystrokes compressed into one blob — diff updates batch nicely).
- **Compaction**: 337 rows / 4,046 B → **725 B snapshot = 5.58× ratio** (grows with how
  much of the prefix is keystroke-granular; ratio improves the longer you wait).
- **Replay speed**: 577 blobs in ~11 ms; scrub point ~3.6 ms. Keystroke scrubbing can be
  done live on a slider.
- **Y.Map whiteboard**: avg **34 B** per position-set blob (JSON payload dominates).

## Ordering requirements the engine MUST honor

1. **Per-doc total order in server-arrival order is sufficient — and required for scrub.**
   Append to the journal in the order updates arrive at the server (journal-before-relay,
   or atomically with relay). Arrival order at a single relay point is automatically a
   *causal* order, and that is what makes every journal prefix a complete, valid doc
   state (zero pending structs at all 10 scrub points). No cross-doc or global ordering
   is needed; one seq counter per collab field/doc.
2. **Full-set application commutes; prefixes do not.** Yjs buffers updates with missing
   dependencies ("pending structs"), so any permutation of the *complete* blob set
   converges (verified 5×). But a prefix of a reordered stream is not a valid state
   (50% shuffled prefix → doc stuck at length 1). Consequence: eventual convergence
   tolerates reordering/duplication, but **scrub and snapshot-at-seq only work if the
   journal preserves a causal order** — which arrival order gives you for free.
3. **At-least-once is fine; dedup is unnecessary.** Yjs updates are idempotent. The
   reconnect diff re-journaled ~100 B of already-journaled content and replay stayed
   exact. The server may double-journal on retry without corruption (only wasted bytes,
   reclaimed at compaction).
4. **Message envelope, not blob inspection.** The relay needs a type tag outside the blob:
   `update` messages are journaled + relayed; sync/state-vector messages are relayed only.
   Alternative worth adopting: seq-based catch-up (server re-sends journal rows > client's
   last-acked seq) needs no sv exchange at all, keeps the server 100% Yjs-ignorant, and
   avoids the redundant re-journaling noted above.
5. **Compaction contract.** The snapshot must equal the doc state produced by replaying
   journal rows 1..S (build it that way server-side with a headless replayer, or verify a
   client-provided checkpoint before deleting). `seq` must never be reused after DELETE
   (use AUTOINCREMENT or a monotonic counter). Scrub history before S is destroyed —
   if full-session scrub is a product requirement, archive compacted segments instead of
   deleting them.
6. **State comparison caveat (maps).** Converged Y.Map replicas are content-equal but key
   *iteration* order can differ across replicas/replay orders. Never compare doc states by
   naive `JSON.stringify`; use canonical serialization or state vectors.

## Files

- `spike.ts` — the whole simulation + assertions + metrics (bun run spike.ts)
- `data/` — throwaway sqlite journals created per run (gitignored)
