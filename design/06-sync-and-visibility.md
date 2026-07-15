# 06 — Sync & visibility

Status: Draft

## Visibility is schema, not etiquette

Every field declares who reads it and who may write it:

```ts
guess: field(z.number().int().min(0).max(100))
        .visible('self')            // opponents never receive it
        .writable('self'),          // client may set it — validated server-side
score: field(z.number())
        .visible(members('game')),  // co-members of the player's `game` group
                                    // no .writable → server-only
```

Defaults are the safe ones: **fields are server-writable and self-visible unless
declared otherwise.**

Two structural properties follow:

1. **Privacy inverts from opt-out to structural.** The engine computes each viewer's
   view; `visible('self')` fields are never transmitted to others. The v2 bug class
   "forgot `private: true`, leaked the confederate's role" stops existing.
2. **Integrity is enforced at the door.** v2 allowed any participant to
   `player.set("score", 999)` from devtools. Here, client writes require `writable`,
   are validated against the field schema (anti-cheat *and* data cleaning), and
   anything richer than a field write is a custom command with server-side logic
   ([04-engine.md](04-engine.md#custom-commands)).

Visibility vocabulary: `'self' | 'server' | 'all' | members(kind) | role(kind, role)`.
Escape hatch for exotic topologies (network neighborhoods): audience *is* group
membership — make the neighborhood a group and use `members(...)`. A per-field predicate
function is deliberately **not** offered in v1 (it defeats audience-class fanout and
per-cursor resume; revisit only with evidence).

## Views and the patch protocol

Per connection, the server maintains a **view**: the entities the player is entitled to
see — self, their groups, co-members' visible fields, current runs, globals. Membership
changes (join a pair, enter a breakout room) atomically extend/shrink the view, with
backfill of newly visible fields in the same patch — so "joined the room" and "can see
the room's state" are one event, not a race.

On each commit: `changed fields ∩ view → patch {seq, changes[]}`.

- **Audience-class fanout.** Patches are serialized once per *visibility class* (all
  members of a group receive identical bytes), then published to that class's topic —
  one publish per class, not N serializations. Maps directly onto the runtime's
  pub/sub topics ([14-design-backlog.md](14-design-backlog.md#stack)).
- **Resume is a cursor.** The client sends its last applied `seq`; every `kv` row carries
  `updated_seq`, so resume = "fields in my view with `updated_seq > cursor`" —
  O(what changed). Stale cursor or changed membership → snapshot fallback. (v2:
  any admin reconnect discarded the world and replayed all history; one player edge case
  was handled by `window.location.reload()`.)
- **Commands are acked with results.** `player.set()` resolves or rejects visibly;
  optimistic updates roll back on rejection. v2 silently dropped refused writes.

## Wire messages

Over one WebSocket (REST mirror in [07-api.md](07-api.md)):

- `hello {token} → welcome {playerId, seq, serverTime, view snapshot | resume diff}`
- `patch {seq, changes[]}` (server → client)
- `command {id, name, payload} → ack {id, ok | error{code, message, field?}}`
- `ping/pong {serverTime}` — continuous **server-clock offset** estimation; countdown
  displays use corrected time (fixes v2's `// TODO sync time`, open for years).
- `presence` — engine-maintained `connected` / `lastSeen` as ordinary visible fields on
  the player; no userland reconstruction from connection events.

JSON framing first; binary (msgpack) only if profiling demands.

## Client-side contract

The client core keeps a per-field mirror store; `set()` applies optimistically and
re-renders locally *immediately* (killing v2's "slider lags one round-trip" behavior),
reconciling on ack/patch. Details in [08-client.md](08-client.md).

## Load envelope (design targets)

- 1,000 concurrent players in 250 groups of 4, one action per player per 5s:
  ~200 commands/sec in, ~800 patch publishes/sec out — far below any modern runtime's
  WS capacity.
- Pathological case: one 100-player group, chat-heavy (1 msg/player/sec) → 100 in,
  10k fan-out msgs/sec — the audience-class publish keeps serialization O(1) per
  message; raw socket fanout remains the runtime's job. Declared supported envelope:
  groups ≤ 250 members for real-time phases (revisit with evidence).

## Acceptance criteria

- Leak test (conformance): a field without `visible` never appears in another player's
  transport bytes — asserted at the wire level in simulation, for every reference
  experiment.
- Rejection test: unauthorized/invalid writes produce typed errors client-side and no
  state change or journal entry (beyond the rejected-command record).
- Resume test: kill connection at random seq under load; reconnect receives exactly the
  missed diff (byte-compared against continuous-connection state).
- Membership-change test: join/leave mid-phase yields atomic view extension/shrink with
  backfill, no orphan or stale fields.
