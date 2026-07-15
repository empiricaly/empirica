# Spec — Wire protocol (resolves A3)

Status: Draft for review. Backs [06](../06-sync-and-visibility.md), [07](../07-api.md),
[08](../08-client.md). Normative: MUST/SHOULD/MAY.

## 1. Transport & framing

- One WebSocket endpoint: `GET /api/stream` (upgrade). JSON text frames in v1
  (binary/msgpack is a protocol-version bump, only if profiling demands).
- Envelope: every frame is `{ "t": "<type>", ... }`. Unknown `t` from server → client
  ignores (forward compat); unknown `t` from client → `bye{code:'PROTOCOL'}`.
- Frame caps: client frames ≤ 64 KiB (matches the field-value cap); server frames
  ≤ 256 KiB — snapshots are chunked (`snapshot` parts with `done` marker).
- REST mirror ([07](../07-api.md)): `POST /api/commands/:name` → the same `ack` JSON;
  `GET /api/view` → the same snapshot JSON. Streaming patches are WS-only.

## 2. Messages

### Client → server

| t | fields | notes |
|---|---|---|
| `hello` | `token, protocol: 1, cursor?, resumeKey?` | first frame, else `bye` |
| `command` | `id, name, payload?, runId?` | `id` = client UUID (idempotency §5) |
| `ping` | `t0` | client clock at send |

### Server → client

| t | fields | notes |
|---|---|---|
| `welcome` | `playerId, seq, serverTime, mode: 'snapshot'\|'diff', position, resumeKey` | after `hello` |
| `snapshot` | `part, of, entities[], done?` | full view, chunked |
| `patch` | `seq, changes[], eph?[]` | §3; strictly increasing `seq` |
| `ack` | `id, ok, seq?, error?{code, message, field?}` | per command, processing order |
| `pong` | `t0, serverTime` | clock sync §6 |
| `bye` | `code, message?` | then close; codes: `AUTH`, `PROTOCOL`, `UPGRADE`, `SLOW_CONSUMER`, `REPLACED`, `SHUTDOWN` |

`REPLACED`: a newer connection authenticated for the same player+device slot; the old
socket closes (no dual-delivery). Multi-tab is supported via distinct device slots
(A4's business); the *default* is one live connection per player.

## 3. Changes encoding

```jsonc
// patch
{ "t":"patch", "seq": 1042, "changes": [
  ["kv",   ["group","g_12"], "pot", 34],            // set
  ["kv",   ["prun","r_9:p_3"], "contribution", 17],
  ["lpush",["group","g_12"], "chat", { "idx": 41, "v": {"text":"hi"},
             "actor": "p_3", "at": 1752561000123 }],
  ["crdt", ["run","r_9"], "essay", "<base64 update>"],
  ["del",  ["pair","g_88"], null, null]             // entity left view (dissolved/ended)
]}
```

- Entity refs are `[type, id]` with short types: `player, group, run, mem, prun, glob`.
- `del` with `key=null` evicts a whole entity from the client cache (view shrink);
  view *growth* arrives as plain `kv` entries (backfill) inside the same patch as the
  membership change — atomicity per [06](../06-sync-and-visibility.md).
- `eph` entries mirror `changes` shape, are never journaled, and are coalesced
  server-side (≤ ~15 Hz per field).

## 4. Cursors & resume

- `seq` is the global journal sequence; each patch carries the seq of the commit that
  produced it. The client persists `(resumeKey, lastAppliedSeq)`.
- Resume rules, in order:
  1. `resumeKey` unknown/expired (server restart beyond retention, redaction since
     cursor, or view-membership changed since cursor) → `welcome{mode:'snapshot'}`.
  2. else → `welcome{mode:'diff'}` followed by one synthetic patch containing all
     view fields with `updated_seq > cursor` (computed from the kv index) and current
     list tails / crdt catch-up (from the collab journal, seq-based — S5's
     recommendation).
- v1 deliberately falls back to snapshot on any membership delta since cursor —
  correctness first; diff-across-membership is an optimization with a recorded-
  equivalence test if ever added.
- Patches apply strictly in order; a gap (missed frame) → client closes and
  reconnects with cursor. No client-side reordering.

## 5. Command idempotency & flow control

- `id` is a client-generated UUID. The server keeps a per-player LRU (128 entries,
  ≥ 5 min TTL) of `id → ack`; duplicates re-emit the original `ack` and are NOT
  re-executed. This makes client retry-after-reconnect safe.
- Rate limits (config, per player): gameplay commands 20/s sustained, burst 60;
  list-append class (chat) 5/s, burst 15; violations → `ack{error:BUDGET_EXCEEDED}`
  (never a disconnect). Timer/admin classes are exempt ([04](../04-engine.md)).
- Server send-queue cap per connection (default 1 MiB or 500 frames): exceeding →
  `bye{SLOW_CONSUMER}`; the cursor mechanism makes this self-healing.

## 6. Clock sync

`welcome` and every `pong` carry `serverTime`. The client maintains an EWMA offset
(RTT/2 correction) and exposes `serverNow()`; all countdown UI derives from
`serverNow()` and timer metadata in state. Target accuracy ± 250 ms, plenty for
behavioral timers (engine resolution is 100 ms).

## 7. Auth (surface only; token internals in A4)

`hello.token` is the player session token. `AUTH` bye on expiry/invalidity; the client
then refreshes via REST (`POST /api/session/refresh` with its refresh credential or
magic-link token) and reconnects. Admin/spectator connections use the same protocol
with admin tokens; their view is the admin view; replay connections
([09](../09-simulation-and-replay.md)) speak this protocol from the journal feeder —
one protocol everywhere.

## 8. Versioning

`hello.protocol` (integer). Server supports current major only in v1; mismatch →
`bye{UPGRADE}` with the supported version in `message`. Because clients ship inside
the sealed bundle with the server, production mismatch is impossible; this protects
dev setups and future SDKs.

## 9. Conformance hooks

- **Golden transcripts**: recorded hello→welcome→patch/ack streams from reference-
  experiment simulations; byte-compared in CI (modulo timestamps, normalized).
- Resume equivalence: for random disconnect points in simulation, diff-resume state
  ≡ continuous-connection state (already in 06; enforced at this layer).
- Duplicate-command fuzz: re-sent ids never double-apply; ack replay verified.
- Slow-consumer drill: throttled client → `SLOW_CONSUMER` → cursor reconnect →
  convergence.
- Cap fuzz: oversized frames, deep JSON, invalid envelopes → typed `bye`/rejects,
  never a crash.

## Open sub-questions

1. Multi-tab UX default: `REPLACED` vs mirrored delivery to N sockets per player —
   proposal: `REPLACED` in v1 (one active tab; the stock client shows "open here"
   takeover), revisit with observer/spectator use cases. → A4/A6.
2. Should `ack.seq` be exposed in the public client API (for "wait until my write is
   visible to peers" patterns)? Proposal: yes, as `await set(...)` resolving at
   commit. Decide with client-core API freeze.
