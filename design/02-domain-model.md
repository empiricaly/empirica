# 02 — Domain model

Status: Draft

Three primitives: **Player**, **Group**, **Flow**. Everything else (treatments, runs,
memberships, allocations) hangs off them.

## Player

The durable human. Merges v2's split between Tajriba `Participant` (identity) and
classic `Player` (data scope).

- `id` — internal, stable.
- `identities` — keyed set of external identifiers (`prolific:PID`, `mturk:workerId`,
  `email:…`, `code:…`). Returning participants deduplicate automatically; multi-day
  designs re-attach by identity.
- `consent` — first-class record (version of consent text, timestamp), not a localStorage
  bit as in v2.
- Flow position (`node`, plus per-node progress), connection state (`connected`,
  `lastSeen` — engine-maintained, not userland reconstruction).
- A typed state bag per the schema ([06](06-sync-and-visibility.md)).

One deployment = one experiment; a Player enrolls once (waves/multi-day sessions are flow
positions, not re-enrollments). Cross-study linking happens at analysis time via external
identities.

## Group — the single sharing primitive

A Group is a set of members with shared state, an optional treatment, and (when inside a
synchronized flow segment) a shared flow position. **Everything that shares state or a
clock is a Group**: the classic "game", a negotiation pair, a breakout room, a chat
channel, a network neighborhood, a team. Groups are cheap rows, formed and dissolved
freely by matchers.

Key properties:

- **Kinds.** Groups are typed. Each kind is declared in the schema with its own fields,
  its own *membership* fields, and its own roles:

```ts
groups: {
  game: {
    fields:  { pot: field(z.number()).visible('members') },
    member:  { contribution: field(z.number().min(0).max(20))
                 .visible('members').writable('self') },
  },
  pair: {
    roles:   ['proposer', 'responder'],
    fields:  { deal: field(z.number()).visible('members') },
    member:  { offer: field(z.number()).visible('members') },
  },
}
```

- **Multi-membership.** A player may belong to several groups at once (their game, this
  round's pair, a sidebar chat). Visibility rules always name the kind they refer to, so
  "the game group sees different fields than the breakout room" is expressed in the
  schema, not in conventions. Within one *kind*, a player holds at most one live group
  by default; kinds declared `multiple: true` allow concurrent same-kind memberships
  (network neighborhoods, parallel chat channels) at the cost of being context-only —
  they carry state and visibility but never flow position (schema spec §1).
- **Roles.** Membership carries an optional role label (buyer/seller, advisor/advisee,
  `standby`). Roles participate in matching constraints and visibility.
- **Mutable membership.** Members can be added/removed mid-flow under engine control —
  this is what makes join-ongoing, dropout replacement, and standby promotion coherent
  ([03-flow.md](03-flow.md)).

## State universe

Typed, visibility-scoped fields exist on exactly these entities:

| Entity | Meaning | v2 analog |
|---|---|---|
| `player` | the human | Player |
| `group(kind)` | shared state of a group | Game (and nothing else) |
| `membership(player × group)` | one player's state *within* a group | PlayerGame |
| `run(node instance)` | one traversal of a flow node (e.g. round 3 of group X) | Round/Stage |
| `player × run` | one player's state within a run | PlayerRound/PlayerStage |
| `global` | deployment-wide | Globals |

`run` deserves emphasis: flow nodes are *definitions*; execution creates *instances*
("group X's 3rd iteration of the `round` loop"), and state attaches to instances. This
replaces v2's pre-created Round/Stage scopes and the `playerRoundID-<id>` attribute
pollution, while preserving the ergonomics (`player.round.set(...)` sugar in templates
resolves to `player × current run`).

## Treatments and factors

Kept as vocabulary — it is standard experimental-design language, older than Empirica.

- **Factor**: a named variable with levels (`reward ∈ {0.5, 1.0}`).
- **Treatment**: an assignment of levels, attached to a *group* (assigned at match time)
  or to a *player* (assigned at enrollment, for solo designs — no more "game of
  playerCount 1" tax).
- Treatments are ordinary state with provenance: the journal records which allocation and
  which randomization decision produced them.
- `playerCount` is **not** a magic factor. Group size is matcher configuration; a factor
  may *feed* the matcher explicitly if group size is itself experimental.

## What replaces Batch

v2's Batch conflated three concerns. Each gets a proper home:

1. **Allocation** — a declarative recruitment target consumed by matchers: "40 groups of
   4, balanced across `reward ∈ {0.5, 1.0}`, eager fill." Allocations queue in creation
   order (preserving the operational muscle memory of batches) and expose progress
   (formed / in-progress / remaining) to the admin.
2. **Intake** — the switch: open / paused / closed, capacity caps, optional schedule
   (coordinate opening with the Prolific posting going live).
3. **Randomization** — lives in the matcher's treatment strategy
   ([03-flow.md](03-flow.md#matching)), where it is inspectable and testable.

## Naming decisions (proposed, to freeze)

- **Player** (not Participant) — user-facing code says `player`; it is the established
  word in this community and in the training data of the LLMs that will write
  experiments.
- **Group / kind / member / role** as above. "Game" is not an engine term; the classic
  template names its top-level group kind `game`.
- **Flow / node / run / stage** per [03-flow.md](03-flow.md).
- **Allocation / Intake** as above; the word "batch" is retired.

## Acceptance criteria

- All three validation experiments ([13](13-reference-experiments.md)) express their
  data as this state universe with no auxiliary bookkeeping fields.
- Export ([05](05-storage.md)) contains zero framework-internal keys — the v2 test:
  nothing that must be filtered out.
