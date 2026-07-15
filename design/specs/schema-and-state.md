# Spec — Schema DSL & state navigation (resolves A2)

Status: Frozen (2026-07-15). Backs [02](../02-domain-model.md), [06](../06-sync-and-visibility.md),
[08](../08-client.md); incorporates F2, F5, F9, F16, F17. Normative: MUST/SHOULD/MAY.

## 1. `defineSchema` shape

```ts
const schema = defineSchema({
  globals:  { /* fields */ },                    // deployment-wide
  player:   { /* fields */ },
  groups: {
    <kind>: {
      roles?:  string[] | Record<string, number>, // list, or counts for formation
      multiple?: boolean,   // default false — see "singular vs plural kinds" below
      fields?: { /* group fields */ },
      member?: { /* membership (player-in-group) fields */ },
    },
  },
  nodes: {                                        // run-scoped state, keyed by node name
    <nodeName>: {
      fields?: { /* run fields (unit-shared) */ },
      player?: { /* player × run fields */ },
    },
  },
});
```

Boot-time validation (F2): every `nodes:` key MUST name a flow node; every flow node
whose hooks/clients touch run state MUST have an entry; group kinds referenced by
`match`/`submatch`/visibility MUST be declared; violations are boot errors with the
offending path in the message.

### Singular vs plural kinds (refines P3)

By default a kind is **singular**: a player has ≤ 1 live group of it (invariant P3),
which keeps `player.group(kind)`, `members(kind)` visibility, and command code
unambiguous. A kind declared `multiple: true` is **plural** — a player may hold many
live memberships of it simultaneously. The canonical need is network topology: a
player of degree k sits in k+1 `neighborhood` groups at once; also concurrent chat
channels, observer rooms.

Plural kinds trade power for restrictions, enforced at boot:

- **Context-only**: a plural kind can never traverse a flow segment, be formed by a
  pool `match` node, hold barriers, or be a `submatch` kind. It carries state,
  visibility, and lists — not flow position. (P1/P2 stay intact.)
- **Plural accessors**: `player.groups(kind)` returns the live list;
  `player.group(kind)` on a plural kind is a compile/boot error, not a runtime
  surprise.
- **Visibility is the union**: a field `visible(members(kind))` on a player is
  received by everyone sharing ≥ 1 live group of that kind with the owner — exactly
  network-neighbor semantics (this is what makes stretch-validation V4 expressible).
- Formation: by hooks/commands (`ctx.groups.create(kind, members)`) or matcher
  decisions targeting a plural kind explicitly.

## 2. `field()` and friends

```ts
field(zodSchema)          // scalar/object value; validation = the zod schema
  .default(v)             // applied at entity/run creation — see §3
  .visible(aud)           // §4; default 'self' on player/member/player-run; 'members'
                          //   on group/run fields? NO — default is the SAFE one: §4
  .writable('self')       // §5; default server-only
  .ephemeral()            // synced, never persisted; excluded from export/replay state
  .label('…')             // admin/export metadata (codebook)
  .showInAdmin()          // admin column hint

list(itemZod, { max?: number })   // append-only; entries engine-attributed (§6)
  .visible(aud)
  .append(aud)            // who may append from the CLIENT ('self' | members(kind))

record(valueZod)          // string-keyed map; .refine(...) for cross-entry constraints

field.collab({ schema: 'prosemirror' | 'plain' | 'map' })   // CRDT doc (S5-verified)
  .visible(aud)           // audience receives/edits the doc; journaled as blob log
```

Limits (defaults, config-overridable): value ≤ 64 KiB serialized; list item ≤ 16 KiB;
list length ≤ 10,000 (hard cap; `max` may be lower); field keys
`[a-zA-Z][a-zA-Z0-9_]{0,63}`; ≤ 256 declared fields per entity. Oversized writes
reject with `VALIDATION_FAILED`.

## 3. Defaults and absence (F5)

- `.default(v)` is materialized when the owning entity/run is created (a `changes` row
  with actor `system`), so exports and hooks see it uniformly.
- A field with no default reads `undefined` until first write. **Absence is data**
  ("player did not act"); hooks handle it explicitly (`?? 0` where the science says
  non-action = zero). Rule of thumb in docs: defaults are for accumulators.

## 4. Visibility

`aud ∈ 'self' | 'server' | 'all' | members(kind) | role(kind, role)`.

- Safe-by-default: player / membership / player-run fields default `'self'`
  (owner + server); group / run / global fields default `'server'` — nothing reaches
  any client unless declared. (Deliberately stricter than convenient; templates
  declare loudly.)
- `members(kind)`: co-members of the owner's live group of `kind` (P3 makes this
  unambiguous). For fields ON a group/run, `'members'` (no argument) = members of that
  group / the run's unit.
- `role(kind, role)`: subset of members(kind) — e.g. observers see trades, players
  don't.
- No predicate visibility in v1 (D15). Topology = groups.
- Reveal timing = **reveal-by-copy** idiom (F1); documented pattern, optional
  `reveal()` sugar deferred.

## 5. Writability

`writable ∈ 'server' (default) | 'self'`. Nothing else. A field two members can both
write, or cross-player writes, is **a custom command by definition** — that's where
validation/ordering logic belongs. Client writes to `writable('self')` fields are
still schema-validated and rejected with typed errors (`NOT_WRITABLE`,
`VALIDATION_FAILED`).

## 6. Lists & attribution (F9, F16)

Every list entry is stored as `(idx, value, actorType, actorId, seq, ts)` — the engine
attributes appends automatically:

- client append (allowed by `.append(aud)`) → actor = the player;
- hook/command append (`group.list('chat').append(v)`) → actor = the causing command's
  actor (player for player-issued commands, `system`/`admin`/`timer` otherwise).

Chat therefore needs no `sender` in user schema; clients read
`list.items()` → `{ value, actor, at }[]`. `.append(aud)` governs only client appends;
server code may always append.

## 7. Navigation API (resolves F17)

### 7.1 Handles

`Player`, `Group`, `Membership`, `Run`, `PlayerRun` — thin typed views over state;
all reads are synchronous; all writes go through the current transaction.

```ts
player.get/set(field)              // player fields
player.treatment                   // player-level treatment or undefined
player.group(kind)                 // unique LIVE group of kind, or undefined (P3)
player.memberships({ live: false })// historical access (export/hook use)

group.get/set(field)               // group fields
group.treatment
group.kind
group.members()                    // live Membership[]
group.member(playerOrId)           // Membership | undefined
group.subgroups(kind)              // live sub-groups formed by this phase's submatch
group.list(field)                  // ListHandle: items(), append(v)

membership.player / .role / .get/set(memberField)

run.get/set(runField); run.list(field)
run.node                           // node name
run.iteration / run.cycle          // innermost / full cycleVector
run.player(playerOrMembership)     // PlayerRun handle (player × run fields)
run.phase                          // enclosing phase run (stage/task runs), else itself
run.sibling(nodeName)              // ★ another node's run in the SAME cycle —
                                   //   V1's cross-stage read: run.sibling('punish')
```

### 7.2 What hooks receive (typed by attachment point)

- Node hooks (`onEnter/onEnd/onExit/onTimeout/validate`): `(ctx, bag)` where the bag
  is the natural scope — `{ run, group }` for phase/stage hooks, `{ run, player }`
  for step/gate hooks. No global lookups needed for the 95% case.
- Field-change hooks: `(ctx, { entityHandle, value, previous })`.
- Command handlers: `(ctx, { player, input })` — `player` is the actor;
  **`ctx.at(nodeName)`** resolves the actor's current live run of `nodeName` by
  walking their position (error `POSITION_MISMATCH` if not live). This replaces V2's
  improvised `ctx.run('tradingRound', player)`:

```ts
// V2 accept-command, revised:
const run = ctx.at('tradingRound');
for (const m of pair.members()) {
  const v = run.player(m).get('valuation');
  ...
}
```

- Admin/service-issued commands have no player actor: `ctx.at` is unavailable; they
  address entities by id (`ctx.group(id)`, `ctx.player(id)`) — admin surface only.

### 7.3 Resolution rules (normative)

- `player.group(kind)` / `ctx.at(...)` NEVER return ended entities; historical access
  is always explicit (`{ live: false }` variants). This keeps hot-path code
  unambiguous (F14/P3).
- `run.sibling(name)` resolves within the same cycleVector and unit; `undefined` if
  that node hasn't run this cycle (e.g. punishment stage absent under the treatment) —
  which makes treatment-conditional reads naturally safe.
- All handles are transaction-scoped: they read the in-transaction state, and they are
  invalid outside their transaction (holding one across an effect is a type error —
  effects receive plain data, not handles).

## 8. Client mirror of the same API

The client core exposes read-only versions of the same handles (`usePlayer()`,
`useGroup(kind)`, `useNode().run.mine`, …) filtered by visibility; `set()` exists only
for `writable('self')` fields; everything else is `command(...)`. One mental model,
both sides — the server API docs are 90% of the client API docs.

## 9. Schema evolution (mid-study; complements flow versioning §7 of flow spec)

On deploy over live data, compare schema hashes:

- **Additive** (new fields, new kinds, new nodes, widened enums, raised `max`):
  allowed; defaults apply to new entities only (existing entities read `undefined` —
  absence-is-data extends to evolution).
- **Destructive** (remove/rename field, narrow validation, change visibility to a
  *wider* audience, change writability to `self`): **refused** on live data. Widening
  visibility is destructive by definition (it would leak already-collected data
  beyond what participants consented to). Narrowing visibility is allowed.
- Schema hash journaled with the bundle hash; export carries both (codebook per
  version).

## 10. Conformance hooks

- Boot-validation matrix (every violation class → exact error).
- Property: no write path exists that bypasses zod validation (fuzz `set`/commands).
- Attribution: every list entry in every reference experiment has a correct actor.
- Evolution matrix: each additive/destructive case → allow/refuse as specified.
- `run.sibling` under conditional stages (V1 punish-off treatment) returns undefined
  and hooks behave.

## Resolved sub-questions (freeze sweep, 2026-07-15)

1. **The `f.*` field-ref builder is adopted** (D18): `f.player(key)`,
   `f.group(kind, key)`, `f.node(name, key)`, `f.global(key)` — compile-checked
   refs, used by gate `when(…, {on})` triggers and field-change hook registration.
2. **`record().keys('members')` is adopted** (D24): validates record keys are live
   co-member ids of the owner's group at write time (`VALIDATION_FAILED` otherwise).
   V1's punishment `assigned` record uses it.
3. **`.ephemeral()` and `.collab()` are not combinable in v1** (D25): live
   cursors/presence inside collab docs ride the Yjs awareness protocol, relayed on
   the ephemeral channel but never journaled — no engine feature needed. Revisit
   only with evidence.
