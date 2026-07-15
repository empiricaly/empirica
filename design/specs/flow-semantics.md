# Spec — Flow operational semantics (resolves A1)

Status: Draft for review. Backs [03-flow.md](../03-flow.md); incorporates validation
findings F1–F24. Normative language: MUST/SHOULD/MAY.

## 1. Definitions

- **Flow program**: the tree produced by `flow.seq/repeat/branch` over nodes. Compiled
  at boot into a static structure with stable **node IDs** (path-derived). Boot-time
  validation: schema `nodes:` keys ⊆ flow node names; every state-bearing node declared
  (F2).
- **Unit**: the thing traversing a node — a player (solo nodes) or a group
  (synchronized segment).
- **Position**: `(flowVersion, nodeId, runId?, status)` where
  `status ∈ {active, waiting, exited(path)}`. **Invariant P1: every player has exactly
  one position at all times.** While a player is a member of an active group in a
  synchronized segment, their position is *derived from the group's* (P2).
- **Run**: one traversal instance of a node by a unit:
  `(nodeId, unitId, cycleVector)` where `cycleVector` is the vector of enclosing
  `repeat` cycle indices (1-based). Runs are created on node entry and ended on exit;
  `run.iteration` is the innermost cycle index. Run state (fields, per-player fields)
  attaches to the run row (02).
- **Live group invariant (P3, F14)**: at any moment a player has **at most one live
  group per kind**. `player.group(kind)` MUST resolve to it or `undefined`; historical
  memberships are queryable but never returned by `group(kind)`.

## 2. Node semantics

### 2.1 `step` (unit: player)

- **Entry**: create run; deliver node metadata to client.
- **Completion**: built-in `completeStep` command (optional payload written to the
  run's player fields first, validated by schema). If the node declares `validate`,
  it runs in the same transaction and MUST return one of (F10):
  - `ok()` — end run, advance;
  - `retry(meta?)` — run persists; `meta` is delivered to the client (attempt counters
    are ordinary state, e.g. `player.quizAttempts`);
  - `route(exitPath)` — exit the player (§5).
- **Timer**: optional `maxDuration`; expiry MUST have a declared consequence
  (`onTimeout: route(...) | complete`). No silent default.
- **Rejoin**: reconnect resumes the same run/position; step progress is server state.

### 2.2 `gate` (unit: player or group) — per-unit, F18

Each waiting unit gets its own run and its own schedule. Three `until` forms (no
implicit dependency tracking — triggers are always explicit or time-derived):

1. `at((ctx, {unit}) => timestamp)` — engine computes the timestamp at entry, arms a
   timer row. MUST be re-computed if referenced state changes? **No** — computed once
   at entry; use form 2 for state-dependent opening.
2. `when(pred, { on: [fieldRefs] })` — predicate re-evaluated when a listed field
   changes, at entry, and on admin nudge. Predicate MUST be pure/sync.
3. Built-ins: `intakeOpen` (re-evaluated on intake state change), `adminRelease`.

Optional: `reminders: [{ at: fn, effect: name }]` (each fires at most once per run,
journaled); `deadline: { at: fn, then: route(path) }` (F23); `reentry: 'magicLink'`
(gate emits signed re-entry links via its invite/reminder effects — token spec in A4,
F20). On satisfaction: end run, advance.

### 2.3 `match` (unit: players in, groups out)

- **Pool** = players positioned at the node, with `waitingSince`, identities,
  player state, and treatment-relevant attributes visible to the policy.
- **Invocation** (engine-triggered, in-transaction): pool arrival/departure,
  node timer tick (if configured), group vacancy referencing this node
  (backfill/replace), allocation or intake change, admin nudge.
- **Policy**: pure sync function → decisions
  `form({members, roles?, treatment?}) | admit(player, group) | route(player, path) |
  hold(player)`. The engine MUST validate every decision (players actually in pool or
  vacancy-eligible; size/role bounds of the kind; allocation quotas) and applies all
  decisions of one invocation atomically. Invalid decision ⇒ whole invocation rejected
  and surfaced (admin alert + log); pool unchanged. Constraint unsatisfiability MUST
  surface, never silently stall (F13).
- **Formation effect**: group created (kind, treatment, memberships+roles, journal
  entry with the randomization provenance); members' positions become group-derived
  (P2); group enters its **segment** (§3.3).
- **Per-player timeout**: `timeout` + `onTimeout: route(...)` — the policy MAY act
  earlier using `waitingSince`.
- v1 restriction: match pools contain players only (no groups-of-groups);
  within-group formation is `submatch` (§2.4).

### 2.4 `phase` (unit: group)

- **Entry**: create phase run; resolve `stages` (list or `(ctx,{group}) => list`)
  **once**, journaled with the run (F4); run `onEnter`; if `submatch` declared, form
  sub-groups now (F11): constraints checked; on failure → declared
  `onSubmatchFail: route | abort(path)` — never silent. Sub-group lifecycle is bound
  to the phase run: dissolved (ended, reason `dissolved`) at phase exit.
- **Stages** (sequence within the phase; each stage = a run, unit: group):
  - `onEnter` → arm `duration` timer (if any) → wait for **barrier**:
    - default: every non-exempt member has issued the built-in `submit` command
      (exempt: role `standby`, members disconnected beyond grace, dropped members);
    - `advance: allOf(kind, pred)` — all live sub-groups of `kind` satisfy `pred`
      (re-evaluated on that kind's field changes, F12);
    - `advance: (ctx, {run, group}) => bool` with explicit `on: [fieldRefs]` triggers.
  - Barrier satisfaction and timer expiry converge on one internal
    `endStage(runId)` command — single-site transition. `onEnd` runs there.
- **Exit**: after last stage — dissolve sub-groups, `onExit`, end run, advance group.
- **Disconnect policy** (two-tier, F6): per-phase
  `{ grace, then: replace|pause|continue|abort, fallback: { then, min, belowMin } }`.
  Grace timers are per-player rows. `replace` promotes a standby (membership role
  swap standby→member, journaled; dropped player's membership → `dropped`, player
  routed per `droppedPath`, default `disconnected`); if no standby, `fallback`
  applies. `pause` freezes the group's timers (stage, grace) — admin-visible, resume
  re-arms remaining durations. `continue` proceeds while `members ≥ min`, else
  `belowMin` (typically `abort(path)`).
- **Late data**: commands carry their target `runId`; a command referencing an ended
  run MUST be rejected with `STALE_RUN` (client drops silently) — the v2
  submit-vs-stage-end race, resolved by taxonomy instead of tolerance.

### 2.5 `task` (unit: player or group)

- Entry: create run; enqueue effect (idempotency key = `nodeId:runId`); unit waits
  (clients render the node like a stage).
- Success: result written to `into` run field; advance. Failure after declared
  retries / `timeout`: `onFail: route | branch.to(...)`. MUST be declared.
- Restart-safe: pending effects re-verified on boot from the effects table.

## 3. Composition semantics

### 3.1 `seq`
Advance to next child on completion; sequence completes with its last child.

### 3.2 `repeat(n | while(pred))`
Condition evaluated before each cycle (`while` predicates: pure sync, over unit
state). Each cycle increments the unit's cycleVector component → fresh runs.
`route()` exits bypass remaining cycles.

### 3.3 Group segments (implicit, deterministic)
A group formed at a `match` node traverses the **maximal contiguous subtree of
group-mode nodes** (`phase`, group `gate`, group `task`) immediately following it.
On reaching a solo node or flow end: group ends (`completed`), members resume solo
traversal at that point (P2 releases). The compiler MUST compute and display each
match node's segment; a `match` immediately followed by a solo node is a boot error.

### 3.4 `branch(pred, a, b)`
Predicate evaluated once at entry (pure sync, journaled), unit enters the chosen arm.

## 4. Group lifecycle

`active → ended(reason)` with `reason ∈ {completed, aborted(path), dissolved}`.
(No observable `forming` state — formation is atomic within the match transaction.)
Membership: `active → dropped | released | ended-with-group`; historical memberships
remain queryable for export/replay. Standby release (A12): trigger per config
(`releaseAfter` duration | phase boundary), releases membership, routes player to
`standbyReleased` path.

## 5. Exit paths

Declared `exits: { name: { code?, onExit? } }`. `route(name)` is valid from step
validation, gate deadline, match policy/timeout, dropout fallback, task onFail,
custom commands, and admin intervention. Engine: end memberships (per group policy),
set position `exited(name)`, run `onExit` (credits — F8/F19; `ctx.redact` for
withdrawal — F24), deliver completion code. Terminal per player. Reaching flow end =
implicit `finished`. Every declared path MUST be reachable or a boot warning.

## 6. Pause (admin)

`pause(group | deployment)` freezes all timers under the target and rejects
gameplay-class commands with `PAUSED` (chat MAY be allowed by config); `resume`
re-arms remaining durations. Both journaled with actor.

## 7. Flow versioning (mid-study deploys)

Flow version = bundle hash. On deploy over a live DB the engine compares the compiled
flow structure against live positions:

- Nodes with **no live runs** may change freely.
- Nodes with live runs: identical structure required; otherwise the deploy MUST be
  refused, unless `--finalize-inflight <exitPath>` routes affected units out first
  (paid via that path's `onExit`).
- Schema: additive changes allowed; changes to existing fields refused on live data
  (A2 owns the details).

## 8. Rejection taxonomy (flow-related)

`STALE_RUN`, `NOT_YOUR_TURN`-class rejections come from user command logic (`reject`);
engine-level: `POSITION_MISMATCH` (command for a node you're not at), `NOT_MEMBER`,
`VALIDATION_FAILED(field, issue)`, `NOT_WRITABLE`, `PAUSED`, `BUDGET_EXCEEDED`
(rate/size limits), `UNKNOWN_COMMAND`, `UNAUTHENTICATED`/`FORBIDDEN`. All rejections
are acked to the sender with code + message; rejected commands are journaled as
rejections (no state change, no `changes` rows).

## 9. Conformance hooks (→ test plan)

Property tests derived from this spec: P1–P3 invariants under arbitrary
arrival/departure/timeout interleavings; single-site stage end; two-tier dropout
matrix (all policy combinations × standby availability); gate schedule survival
across restart; segment computation (match followed by solo = boot error);
STALE_RUN on every post-end command; deploy-over-live refusal matrix.

## Open sub-questions (tracked, non-blocking for review)

1. `when(pred, {on})` field-ref syntax — settle in A2 alongside the navigation API
   (F17).
2. Group-level `branch` inside a segment on group state — allowed (pred over group
   state); confirm no solo/group mixing ambiguity in the compiler rules.
3. Nested `submatch` (pairs within rooms within market) — defer; one level in v1.
4. Whether `pause` extends per-player gate deadlines (proposal: yes, by pause
   duration) — decide with A5 fairness review.
