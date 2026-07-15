# 10 — Admin: algebra-driven UI & live operations

Status: Frozen (2026-07-15)

## Principle: the admin renders the algebra, not the experiment

v2's dilemma: a generic scope browser says nothing; a classic-only UI locks the
platform. The resolution is the closed node algebra ([03-flow.md](03-flow.md)) — node
types have fixed operational semantics, so one admin implementation adapts to *any*
flow with zero experiment-specific code:

- **Pipeline view**: the compiled flow as a diagram with live per-node counts — the
  funnel every operator actually wants.
- **Canonical widget per node type**:
  - `step` → completion counts, median time-on-step, stuck players
  - `gate` → waiting pool, predicate/schedule status, manual release button
  - `match` → pool, groups being formed, allocation progress (formed / in-flight /
    remaining per treatment)
  - `phase` → groups per stage, timers, submit status, disconnect flags
  - `task` → pending / failed effects, retry / dead-letter controls
- **Entity tables** (players, groups, runs) generated from the schema; experiment
  enrichment via schema metadata only (`.label('Guess')`, `.showInAdmin()`) — never via
  custom admin code.

## Architecture: a privileged client of the same protocol

The admin is a client-core consumer ([08](08-client.md)) with an admin-scoped view
(sees `server`-visible fields; subject to its own audit trail). One sync
implementation, live dashboards for free, and the admin exercises the same code paths
the experiment does — it cannot drift.

## Interventions (the operator's toolkit)

Every intervention is a **command**: journaled, attributed, replayable — an audit trail
IRBs will like. Core set, mapped to real babysitting practice:

- extend / pause / resume a timer (group or stage scope)
- release a gate; nudge a matcher; promote a standby; kick / route a player to a paid
  exit path
- message a player / group (server broadcast field, rendered by a stock component)
- open / pause / close intake; advance / cancel an allocation
- retry / abandon a dead-lettered effect
- force-end a group via a declared exit path (fair-pay implications flow to the payment
  hook)

Plus the replay/spectate pane ([09](09-simulation-and-replay.md)) and export
([05](05-storage.md)).

## Out of scope for v1

Experiment *authoring* in the admin (v2's treatments editor grew this way). Authoring
lives in code; the admin operates deployments. Allocation/intake manipulation is
operation, not authoring, and stays.

## Acceptance criteria

- The three validation experiments render fully in the admin with zero
  experiment-specific admin code.
- Every intervention appears in the journal with actor identity and is visible in
  replay.
- Operator drill (scripted): detect a stuck group in simulation via the pipeline view,
  extend its timer, promote a standby, and route a ghost player out — all within the UI.
