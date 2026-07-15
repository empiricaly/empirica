# 01 — Diagnosis: what v2 taught us

Status: Frozen (2026-07-15)

This is the evidence base for the rewrite, from a full audit of the v2 codebase
(Go orchestrator, Tajriba, `@empirica/core` admin + player layers, stress tests).
Each finding ends in a requirement carried forward. File references are to the v2 tree.

## 1. The brain was a remote client of its own database

The Node "callbacks" process — where all experiment logic runs — is a GraphQL/WebSocket
*client* of Tajriba. It therefore had to mirror the world and reinvent, in userland:

- **A reactive in-memory database** — `shared/scopes.ts`, `shared/attributes.ts`: manual
  dirty bits, JSON-compare change detection, optimistic writes with server
  reconciliation.
- **Transactions** — the `done`/`scopesUpdated` batch boundaries in `admin/runloop.ts`
  simulate a commit so attribute changes appear atomically to callbacks.
- **Foreign keys and indexes** — relationships are string-ID attributes; `batch.games` is
  a linear scan of every scope of a kind, on every access (`classic/models.ts`).
- **Idempotency** — reconnection tears down the entire in-memory world and replays all
  history; so "has this callback run" is persisted *into experiment data* as
  `ran-before-<attrId>` attributes (`admin/events.ts:82`), which the exporter must then
  strip back out (`classic/api/api.ts:29`).

**Requirement:** experiment logic, engine, and storage share one process and one
transaction boundary. No mirror, no replay, no reconciliation protocol.

## 2. Genericity bought nothing and cost everything

Tajriba's schemaless scope/attribute model meant the whole domain (Batch, Game, Round,
Stage, `submit`, current-stage pointers, `playerGameID-<id>` conventions) existed only as
convention in TypeScript. Consequences: nothing enforceable or indexable; a
`reservedKeys` blocklist because user data and framework pointers share one namespace
(collisions silently dropped user attributes); an admin UI that could not say anything
intelligent about a generic scope graph. No second consumer of Tajriba ever
materialized to justify the abstraction.

**Requirement:** a typed, schema-declared domain. Generality confined to designated
policy slots ("closed algebra, open policies", [03-flow.md](03-flow.md)).

## 3. Correctness was emergent, not designed

- A stage ends via three racing paths (server timer transition, submit tally, explicit
  `end()`); colliding transitions are *expected* and the errors deliberately swallowed
  (`runloop.ts:233`).
- `tryToStartGame` carries: *"NOTE: this is not right… sometimes we might not start the
  game. I think."* (`classic.ts:313`).
- The stress suite's own comments: the 4-batch × 10-player assignment test *"fails about
  1/2 of the time"* (overbooking race); the staggered-arrival test is skipped.
- Crash at 10+ concurrent players from a null-`timerID` race (issue #595, fixed 1.12.4).

The practical envelope was ~10 players/game, bounded by races, not throughput.

**Requirement:** single-writer command loop; matching and stage transitions are
transactional; collisions are impossible by construction, not tolerated by error
swallowing. ([04-engine.md](04-engine.md))

## 4. Privacy and integrity were opt-in

Every client received the full game state for all players; hiding a field required
remembering `private: true` on each write — forget once, and opponents' clients receive
it. Conversely, any participant could open devtools and `player.set("score", 999)`;
writes were not validated.

**Requirement:** visibility and writability declared in the schema, enforced by the
engine; fields are server-writable and self-visible unless declared otherwise; client
writes validated against the schema. ([06-sync-and-visibility.md](06-sync-and-visibility.md))

## 5. Operational fragility

- Unresolved memory growth (dedicated `MEMORY_ISSUE_GUIDE.md` asking users for pprof
  dumps); no eviction path for ended games in either Tajriba or the runloop maps; boot
  replays the entire append-only JSONL into RAM.
- Client recovery for a mid-session provider conflict: `window.location.reload()`
  (`player/context.ts:114`).
- Stage countdowns trust the client clock (`// TODO sync time`, `player/steps.ts:61`).
- Process supervision detects readiness by substring-matching child stdout; config
  endpoints unauthenticated (`// TODO sercure these endpoints`); `cors.AllowAll()`.
- Toolchain sprawl: Go binary + version-proxy binary + Volta bootstrap + go-bindata +
  Node children.

**Requirements:** state tables are the runtime truth (boot is O(state), ended sessions
cost disk not heap); reconnect is a cursor; server-time offset in the protocol; one
process, one toolchain; authenticated admin surface.

## 6. What v2 got right (kept, on merit)

- **Append-only history** — right instinct, wrong place: it was the *runtime*
  representation. Kept as a journal *beside* materialized state, same transaction
  ([05-storage.md](05-storage.md)) — because provenance is a scientific requirement.
- **Treatments/factors vocabulary** — standard experimental-design language; kept.
- **Attribute-style `get`/`set` on scoped state bags** — good ergonomics; kept, typed.
- **The React data-hook DX** — good shape; rebuilt on per-field subscriptions, and moved
  to userland templates rather than privileged core ([08-client.md](08-client.md)).
- **Intro → synchronized group phase → exit** as the common shape — kept as the default
  *template*, not as the engine's ontology.
