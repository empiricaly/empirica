# 05 — Storage: SQLite layout, journal, retention

Status: Draft

One SQLite file per deployment, WAL mode, synchronous driver, single writer
(the command loop). Four layers, all written in the same transaction.

## 1. Core tables

Real columns, real foreign keys, real indexes:

- `players(id, created_at, consent_version, consent_at, flow_node, flow_version, ...)`
- `identities(player_id, provider, external_id)` — unique per (provider, external_id)
- `groups(id, kind, treatment_json, status, flow_node, ...)`
- `memberships(player_id, group_id, role, joined_seq, left_seq)`
- `runs(id, node_id, iteration, owner_type, owner_id, started_seq, ended_seq)`
- `timers(id, fires_at, command_json)`
- `allocations(id, spec_json, status, position)` / `intake(state, schedule, caps)`
- `effects(id, type, key, status, attempts, input_json, result_json, ...)`

`group.members` is an indexed lookup — never a scan (v2's `batch.games` anti-pattern).

## 2. State (schema-declared fields)

- `kv(entity_type, entity_id, key, value_json, updated_seq)` — primary-keyed on
  (entity_type, entity_id, key); `updated_seq` indexed (it is the sync cursor,
  [06](06-sync-and-visibility.md)).
- `lists(entity_type, entity_id, key, idx, value_json, seq)` — true append semantics for
  chat and event streams; appends are inserts, never read-modify-write.
- Ephemeral fields (typing indicators, cursors, drag ghosts): in-memory only, synced,
  never written — declared `ephemeral` in the schema.
- Collab fields (CRDT docs): update log in `collab_updates(field_ref, seq, update_blob)`
  plus periodic compaction snapshots ([08-client.md](08-client.md#collab-fields)).

Why kv rows rather than typed columns: preserves `get`/`set` ergonomics, gives per-field
sync cursors for free, and avoids migrations for experiment-schema evolution. The cost —
raw queryability — is repaid by generated export views (below).

## 3. Journal

- `events(seq, ts, actor_type, actor_id, command, payload_json, bundle_hash)` — the
  command log; `seq` is the causal order of the experiment.
- `changes(seq → events.seq, entity_type, entity_id, key, old_json, new_json)` — per-field
  diffs with provenance.

`events` is what deterministic replay consumes; `changes` is what science consumes
(who changed what, when, caused by what). Both committed atomically with state — they
can never disagree (the property v2's `done` batches only simulated).

`bundle_hash` stamps the exact experiment code version into every event
([11-packaging-and-deploy.md](11-packaging-and-deploy.md)) — provenance down to the
build, forever.

## 4. Boot, memory, retention

- Boot = open file, re-arm timers, listen. O(current state), no history replay
  (v2 replayed the full JSONL into RAM on every start).
- Ended groups/runs cost disk, not heap. In-memory caches (visibility indexes, connected
  views) are bounded by *live* entities. This is, in one sentence, the v2 memory-leak
  fix.
- Periodic state-hash snapshots (`snapshots(seq, hash, blob?)`) accelerate scrub-seeking
  and verify replay integrity.

## Export

Primary artifact: an **analysis-ready SQLite/DuckDB file with curated views** —
tidy per-entity tables (players, groups, memberships, runs, per-player-per-run) joined
and pivoted from `kv` + `changes`; plus the full provenance log. CSVs are generated
*from those views* for the R workflow. One exporter, one documented shape
(v2 shipped two divergent exporters that filtered framework droppings out of the data).

Bonus from schema: an auto-generated **codebook** — every exported column with its type,
validation range, visibility, and the treatment factors — straight from the schema
declarations. Reviewers and replicators get documentation for free.

## Withdrawal vs. append-only (GDPR / IRB) — designed, not patched

Participants have the right to withdraw and (in many jurisdictions) to erasure; the
journal is append-only. Resolution: **redaction is a first-class command**.
`redact(player)` rewrites that player's `payload_json`/`old/new_json` values to
tombstones in place, preserving structure (event counts, sequence, timing) while
destroying content, and journals the redaction itself. Consequences accepted: replay of
a redacted session reproduces structure but not content; no hash-chaining of the journal
in v1 (it would break redaction; revisit only with per-participant crypto-shredding,
see [14-design-backlog.md](14-design-backlog.md)).

## Runtime configuration (mandatory — from spike S1)

S1 measured that SQLite's default inline WAL autocheckpoint is the entire latency
tail of the command loop (stalls up to 780 ms on the writer's COMMIT; run-to-run p99
varied 40×). The engine MUST ship:

- `journal_mode=WAL`, `synchronous=NORMAL` (FULL craters throughput ~9×),
  `wal_autocheckpoint=0`, `busy_timeout` on the writer;
- a **checkpointer worker thread**: `wal_checkpoint(PASSIVE)` ~1 s cadence +
  `wal_checkpoint(RESTART)` ~10 s cadence (TRUNCATE stalls the writer 2–3× longer
  than RESTART; PASSIVE alone leaks the WAL unboundedly under sustained writes —
  1.5 GB in 2 min at 1000 cmd/s);
- prepared-statement reuse (~23% throughput) and plain deferred `BEGIN`
  (`BEGIN IMMEDIATE` measured ~25% slower single-writer in bun:sqlite).

With this config: p99 command→ack 0.84 ms at 1,000 connections / 200 cmd/s over a
10-minute soak, RSS flat, functionally sound to 5,000 cmd/s
([spikes/s1-bun-command-loop](spikes/s1-bun-command-loop/README.md)).

## Sizing sanity

A 4-player, 10-round, chat-heavy session ≈ low thousands of events, well under 5 MB.
A 1,000-participant deployment fits in single-digit GB — trivially within SQLite's
comfort zone, and within Litestream's for continuous offsite backup
([11](11-packaging-and-deploy.md)).

## Acceptance criteria

- Restore drill: Litestream point-in-time restore mid-session → players reconnect via
  cursors with zero committed-state loss.
- Export golden tests: byte-stable outputs from a journaled reference session.
- Redaction test: post-redaction export contains no participant content; replay still
  runs to completion.
- `PRAGMA integrity_check` + foreign-key checks green under the chaos suite.
