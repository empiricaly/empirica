# 13 — Reference experiments: validation set & shipped library

Status: Draft

Two distinct roles:

1. **Validation set** — three deliberately dissimilar designs that must be expressible
   at `experiment.ts` fidelity *before the engine contract freezes*. They are the test
   of the algebra; if one cannot be expressed, we found the design flaw at week six,
   not at v1.3.
2. **Shipped library** — runnable, documented examples installed by the CLI; the remix
   substrate for LLM authorship and the de facto tutorial.

## Validation set (design-blocking)

### V1 — Public goods with punishment & chat
The classic multiplayer shape, done completely: 4 players, contribution → punishment →
result stages over 10 rounds, in-group chat, treatment factors (MPCR, punishment
on/off), standby over-recruitment, dropout policy `continue (min 3)`, Prolific exit
paths. Stresses: stages/barriers, group chat via `lists`, standby promotion, payment
computation.

### V2 — Continuous double-auction market with re-matching
12 traders; each round, buyers/sellers re-paired (`pairs({constraint: noRepeat()})`
within the phase); order book as group state via custom commands (`bid`, `ask`,
`accept` — server-validated); real-time price chart; role asymmetry (private valuations
via `visible('self')` membership fields). Stresses: multi-membership (game + pair),
roles, within-phase matching, custom commands, high-frequency updates, per-role privacy.

### V3 — Two-wave longitudinal survey with treatments
Solo (no groups at all): wave 1 survey → treatment assignment at enrollment →
scheduled gate (day 7, magic-link re-invitation) → wave 2 → payment per wave.
Stresses: gates/scheduling, re-entry auth, solo-study ergonomics (no group-machinery
tax), partial-completion payment, attrition handling.

### Stretch validations (should pass; not freeze-blocking)
- **V4 — Network cooperation game**: players on a static graph; neighborhoods as
  groups; visibility = `members(neighborhood)`. Stresses audience topology.
- **V5 — Group deliberation with shared document + LLM moderator**: collab field
  (CRDT essay), `task`-node LLM summarizer between stages, LLM bot as a discussion
  participant. Stresses collab fields, effects, LLM bots — the trending frontier.

## Shipped library (v1 targets)

Canonical paradigms, each: `experiment.ts` + client + simulation test + README with the
literature citation and the data dictionary.

| Category | Examples |
|---|---|
| Dyadic games | dictator, ultimatum, trust game, repeated prisoner's dilemma |
| Group economics | public goods (± punishment), beauty contest, minimal group paradigm |
| Markets | double auction (from V2), Schelling coordination |
| Group process | hidden-profile task ("Lost at Sea"), Delphi forecasting, deliberation |
| Perception/estimation | jellybeans estimation (homage), wisdom-of-crowds with social info |
| Real effort | slider task, encoding task |
| Longitudinal | two-wave survey (from V3) |
| Human-AI (trending) | LLM advisor study, human-AI team task, LLM-participant replication of a classic game |

Solo-friendly subset doubles as the "my first experiment" tutorial track.

## Why this matters for the autonomous build

Each library entry is simultaneously: an end-to-end acceptance test (its simulation
suite gates CI), documentation (annotated source), and LLM scaffolding (remix corpus).
The library is not post-launch content — it is part of the test plan
([15-development-plan.md](15-development-plan.md)).

## Acceptance criteria

- V1–V3 written at full `experiment.ts` fidelity against the frozen docs, reviewed, and
  kept in-repo as the contract's canary (paper stage: before implementation).
- Each shipped example: simulation suite green, privacy leak-test green, export golden
  file, admin renders without custom code.
