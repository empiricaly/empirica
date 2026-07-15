# Empirica v3 — Design Documents

This directory contains the design for a ground-up rewrite of Empirica: a single-process
TypeScript engine for real-time multiplayer behavioral experiments, replacing the
Go + Tajriba + Node-callbacks architecture of v2.

The design is being developed **documentation-first**: every significant decision is
recorded here, argued from experimental/scientific need, and frozen before implementation
begins. The end state is a spec complete enough to drive a largely autonomous,
LLM-executed development effort with full test coverage and documentation.

## Reading order

| # | Doc | Contents | Status |
|---|-----|----------|--------|
| 00 | [Vision](00-vision.md) | What the system is for, first-principles requirements, non-goals | Draft |
| 01 | [Diagnosis](01-diagnosis.md) | Evidence-based post-mortem of v2; lessons → requirements | Draft |
| 02 | [Domain model](02-domain-model.md) | Player, Group kinds, memberships, state universe, treatments | Draft |
| 03 | [Flow](03-flow.md) | The flow algebra: five node types, composition, matching, allocations | Draft |
| 04 | [Engine](04-engine.md) | Command loop, transactions, hooks vs effects, timers, determinism | Draft |
| 05 | [Storage](05-storage.md) | SQLite layout, journal, changes log, retention, withdrawal | Draft |
| 06 | [Sync & visibility](06-sync-and-visibility.md) | Schema-declared visibility, views, patch protocol, cursors | Draft |
| 07 | [API](07-api.md) | Commands/queries, WS + REST framing, custom commands, SDKs | Draft |
| 08 | [Client](08-client.md) | Transport seam, stores, React bindings, optimistic writes, collab fields | Draft |
| 09 | [Simulation & replay](09-simulation-and-replay.md) | Sim harness, bots, deterministic replay, session scrubbing | Draft |
| 10 | [Admin](10-admin.md) | Algebra-driven admin UI, live interventions | Draft |
| 11 | [Packaging & deploy](11-packaging-and-deploy.md) | Project shape, sealed bundles, deploy adapters, Litestream | Draft |
| 12 | [Integrations](12-integrations.md) | Prolific & co., payments, webhooks | Draft |
| 13 | [Reference experiments](13-reference-experiments.md) | Validation set + shipped example library | Draft |
| 14 | [Design backlog](14-design-backlog.md) | Open questions, required spikes, decision log | Living |
| 15 | [Development plan](15-development-plan.md) | Path to autonomous LLM-driven implementation | Draft |

### Detailed specs (`specs/`)

Normative specs resolving backlog A-items; where a spec and a numbered doc differ,
the spec wins: [flow-semantics](specs/flow-semantics.md) (A1),
[schema-and-state](specs/schema-and-state.md) (A2),
[wire-protocol](specs/wire-protocol.md) (A3),
[identity-and-auth](specs/identity-and-auth.md) (A4),
[payment-ledger](specs/payment-ledger.md) (A5), [failure-ux](specs/failure-ux.md) (A6),
[redaction](specs/redaction.md) (A7 ⚖ legal review),
[observability](specs/observability.md) (A8),
[i18n-and-a11y](specs/i18n-and-a11y.md) (A10),
[versioning-and-upgrades](specs/versioning-and-upgrades.md) (A11),
[standby](specs/standby.md) (A12).

### Validation & spikes

- [`validation/`](validation/) — V1–V3 written at full `experiment.ts` fidelity
  (all expressible; findings F1–F24 folded into the backlog).
- [`spikes/`](spikes/) — runnable risk-retirement spikes with results READMEs.

## Design principles (summary)

1. **One process, one transaction.** Engine, experiment logic, and storage live together.
   State changes are commands through a single-writer loop; hooks run exactly once, inside
   the transaction that caused them.
2. **Closed algebra, open policies.** The flow language is a small, closed set of node
   types with fixed operational semantics (that's what makes the admin UI, replay, and
   validation possible). Everything interesting inside a node — matching policy, stage
   structure, predicates — is user code.
3. **Every concept must serve an experimental need.** Controlled randomization,
   synchronization of humans in time, provenance, participant welfare, data integrity,
   live operability. Nothing is carried over from v1/v2 by familiarity alone.
4. **Schema is law.** Field types, validation, visibility, and writability are declared
   once and enforced by the engine — privacy and anti-cheating are structural, not
   etiquette.
5. **Deterministic and simulatable.** Seeded RNG, logical clock, journaled commands.
   A full session runs headless in milliseconds; any session can be replayed and
   scrubbed. This is both a science feature (provenance, audit) and the LLM development
   loop (write → simulate → read typed failure → fix).
6. **The engine API is the only API.** Convenience layers (the "classic" experiment
   shape) live as visible, editable code in the user's project, not as privileged
   framework layers.
7. **Boring to operate.** One SQLite file, one sealed executable bundle, continuous
   offsite backup, one-command deploy. Scale-up, not scale-out; thousands of concurrent
   participants on one node.

## Status & process

Docs move `Draft → Review → Frozen`. Implementation of an area does not begin until its
doc is Frozen. Decisions that reverse a frozen doc are recorded in the
[decision log](14-design-backlog.md#decision-log).

The design deliberately precedes any code except **spikes** (throwaway experiments listed
in [14-design-backlog.md](14-design-backlog.md#spikes)) whose only purpose is to retire
runtime/library risk before the docs freeze.
