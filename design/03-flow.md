# 03 — Flow: the algebra, matching, allocations

Status: Draft — **normative operational semantics now in
[specs/flow-semantics.md](specs/flow-semantics.md)** (per-unit gates, two-tier dropout,
`submatch`, sub-group barriers, group segments, exit paths, flow versioning). Where this
doc and the spec differ, the spec wins.

The flow is a **structured program**, not an arbitrary state chart: a closed set of five
node types composed with `seq`, `repeat`, and `branch`. Closed deliberately — because
every node type has fixed operational semantics, the admin UI, replay, static validation,
and simulation can all understand *any* flow without experiment-specific code.

> **Principle: closed node algebra, open policies.** New capability comes from the policy
> slots inside nodes (predicates, matchers, stage structures, handlers), not from new
> node types. Extending the algebra itself is an engine RFC, not a userland option.

## The five node types — distinguished by who performs them

| Node | Performed by | Semantics |
|---|---|---|
| `step` | one player, solo | self-paced page(s): consent, instructions, quiz, survey. Server tracks position; completion may be server-validated (quiz grading in a hook). Optional max-duration timer. |
| `phase` | a group, together | the synchronized segment: an inner sequence of **stages**, each with optional duration and submit-barrier ("advance when all submitted or timer fires"). |
| `gate` | the clock / a condition | hold until: predicate over state, a datetime (multi-day waves), pool size, admin release. |
| `match` | the matcher | form/modify groups from the players waiting here; assign treatments/roles; route players onward or out. |
| `task` | the server | an *effect performed as a flow position*: LLM call, payment computation, external fetch. The performing unit (player or group) waits at the node; the result lands in run state; failure paths are declared (`timeout`, `onFail`). See [04-engine.md](04-engine.md#effects). |

Composition: `seq(...)`, `repeat(n | while(pred))`, `branch(pred, a, b)`. Loops create
fresh **runs** per iteration ("round 3" = third run of the loop body).

Solo nodes are traversed by players; `phase`/`match`-formed segments by groups. The
engine owns the handoffs (the exact seam v2's lobby code patrolled with races).

## The classic template, expressed in the algebra

```ts
flow.seq(
  step('consent'), step('instructions'), step('quiz', { validate: gradeQuiz }),
  gate('intake', { until: intakeOpen }),
  match('lobby', groups.fixedSize({ size: 4, fill: 'eager', timeout: '5m',
                                    onTimeout: 'startUndersized' })),
  repeat(10, phase('round', stages: [
    stage('decision', { duration: '30s' }),
    stage('result',   { duration: '10s' }),
  ])),
  step('exitSurvey'), step('payment'),
);
```

No engine privileges: this is template code in the user's project. Flows may be
parameterized by treatment (the v2 `onGameStart`-builds-rounds pattern becomes a
function producing the flow, evaluated at group formation).

## Matching

A `match` node owns a **pool**: players whose flow position is that node. The matcher is
a **pure decision function**, invoked by the engine inside the transaction on every
pool-relevant event:

```ts
type Matcher = (pool: Pool, ctx: MatchCtx) => Decision[];
// events that trigger invocation: arrival, departure, timer, group vacancy, admin nudge
// decisions: form({members, roles?, treatment?}), admit(player, group),
//            route(player, exitPath), hold(player)
```

The engine applies decisions atomically; the matcher never touches bookkeeping. Because
matching is single-writer and transactional, v2's overbooking/assignment races are
impossible by construction.

### Stock policy library

Defaults are what 90% of studies (and the LLMs writing them) will use:

- `groups.fixedSize({ size, fill: 'eager' | 'cohort' })` — eager starts each group the
  moment it fills (streaming arrivals); cohort waits and randomizes the whole pool at
  once (stronger randomization). Replaces v2's simple/complete batch modes and the
  "1 batch of N vs N batches of 1" folklore.
- Treatment strategies, composable: `balanced()` (block randomization), `sequence([...])`,
  `stratified({ by })`, quota-constrained. A real randomization library — blocking,
  stratification, counterbalancing — not `pickRandom`.
- `groups.backfill()` — admit into running groups (join-ongoing done coherently: the
  joiner's position jumps to the group's current node through a declared catch-up step).
- Within-phase matchers for re-matching designs: `pairs({ constraint: noRepeat() |
  roundRobin() | randomPerfect() })` — same function shape, pool = the group's members.
- **Standby**: over-recruit into role `standby`; auto-promote on dropout; release with
  pay at phase start. Every serious lab does this by hand today; here it is config.

Timeout behaviors are part of the node config: start undersized, route to a solo variant,
route to a paid exit.

## Dropout & membership policy

Per-phase configuration, with a hook for custom handling:

```ts
phase('round', {
  onDisconnect: { grace: '30s', then: 'replace' /* | 'pause' | 'continue' | 'abort' */ },
  stages: [...],
})
```

- `replace` pulls from standby (or re-opens the match node with `backfill`).
- `pause` freezes the group's timers (engine-supported, journaled, admin-visible).
- `continue` shrinks the group (matcher constraints define the minimum viable size).
- `abort` ends the group's segment via a declared exit path (fair-pay implications flow
  to the payment hook).

Membership changes are commands like everything else: auditable, replayable.

## Allocations & intake (operational layer)

See [02-domain-model.md](02-domain-model.md#what-replaces-batch). Matchers consume the
active Allocation (quotas per treatment, fill order); Intake governs whether the gate
before matching admits anyone at all. Both are admin-controllable at runtime and fully
journaled.

## Error states & edge semantics (to specify precisely before freeze)

- A player may occupy exactly one flow position; multi-membership does not imply
  multi-position (pairs formed *within* a phase share the phase's position).
- Rejoin semantics per node type (step: resume; phase: rejoin current stage; gate/match:
  re-pool).
- Group lifecycle: `forming → active → ended(reason)`; reasons are declared exit paths.
- Flow versioning: a deployed flow change mid-study creates a new flow version; players
  in-flight continue on their version ([14-design-backlog.md](14-design-backlog.md)).

## Acceptance criteria

- The three validation experiments express *all* coordination logic in the algebra —
  no timers, polling, or membership bookkeeping in user hooks.
- The admin can render funnel + per-node live state for all three with zero
  experiment-specific code ([10-admin.md](10-admin.md)).
- A property test: no sequence of arrivals/departures/timeouts can double-assign a
  player or overfill a group (the v2 stress-suite failures, as a conformance test).
