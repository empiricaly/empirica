# 14 — Design backlog: open questions, spikes, decisions

Status: Living document

Everything that must be resolved before the docs freeze and autonomous implementation
begins. Ordered by how much they constrain everything else.

## Findings from paper validation

V1–V3 ([validation/](validation/)) were written at full fidelity (2026-07). Verdict:
**all three expressible; no structural changes.** The 24 findings (F1–F24, detailed in
the validation docs) resolve or reshape backlog items as follows:

- **Resolved in direction, needs spec text**: A5 (payment = journaled **credit ledger**,
  `ctx.pay.credit`, F8/F19); step-validation contract `ok/retry/route` (F10, → A1);
  gates are **per-unit** with per-player timers/deadlines/reminders (F18, → A1/03);
  dropout policy is two-tier with fallback chain (F6, → 03); phase-level `submatch`
  with run-bound sub-group lifecycle (F11, → 03); sub-group barrier predicates
  `allOf(kind, pred)` (F12, → 03); ≤ 1 live group per (player, kind) invariant (F14,
  → A1); reveal-by-copy as the documented idiom, no new visibility primitive (F1,
  upholds D15); schema `nodes:` section for run state with boot-time flow↔schema
  validation (F2, → A2); colocated node lifecycle hooks (F3, → A1/A2).
- **New work surfaced**: run/state navigation API needs real design, not just spec
  (`run.node(...)`, `ctx.run(...)` felt improvised — F17, → A2); **A12 (new): standby
  release policy** (release trigger, pay, exit path — F7); magic-link re-entry hooks
  at gates (F20, → A4); withdrawal as a declared exit path invoking `ctx.redact`
  (F24, → A7); matcher constraint unsatisfiability surfacing (F13, → 03/10).

## A. Design questions still open

### A1. Precise flow semantics (blocking: 03, 04) — **DRAFTED**
Resolved in [specs/flow-semantics.md](specs/flow-semantics.md): positions/runs/units,
P1–P3 invariants, per-node semantics (incl. per-unit gates, step validation contract,
two-tier dropout, submatch, barriers, task nodes), group segments, exit paths, pause,
flow versioning, rejection taxonomy. Remaining sub-questions tracked at the bottom of
the spec (field-ref syntax → A2; nested submatch deferred; pause-vs-deadline
interaction → A5 review).

### A2. Schema DSL final form (blocking: 02, 06, 08) — **DRAFTED**
Resolved in [specs/schema-and-state.md](specs/schema-and-state.md): `defineSchema`
shape with `nodes:` section, `field()/list()/record()/field.collab()` API, safe-default
visibility, writable ∈ {server, self} only (everything else is a command), engine-
attributed list appends, defaults-vs-absence semantics, size limits, the full
navigation API (handles, `ctx.at()`, `run.sibling()` — resolves F17), and the
additive/destructive schema-evolution matrix (widening visibility = destructive).
Remaining sub-questions tracked in the spec.

### A3. Wire protocol spec (blocking: 06, 07, 08) — **DRAFTED**
Resolved in [specs/wire-protocol.md](specs/wire-protocol.md): envelope + message set,
compact changes encoding with atomic view backfill/eviction, cursor & resume rules
(snapshot fallback on membership delta), per-player command idempotency LRU, rate
limits as rejects (never disconnects), slow-consumer self-healing, EWMA clock sync,
and golden-transcript conformance. Multi-tab default and ack-seq exposure tracked as
sub-questions (→ A4/A6, client-core freeze).

### A4. Identity & auth details (blocking: 07, 12) — **DRAFTED**
Resolved in [specs/identity-and-auth.md](specs/identity-and-auth.md): stateful opaque
hashed tokens (no JWT), device slots with REPLACED semantics, single-use magic links
for wave re-entry/device switching, consent-version bumps forcing engine-inserted
re-consent, admin argon2id+TOTP with CSRF-hardened cookies, scoped PATs, and
revocation tied into `ctx.redact`. Self-service recovery and admin roles tracked as
sub-questions.

### A5. Payment & money bookkeeping (blocking: 12) — **DRAFTED**
Resolved in [specs/payment-ledger.md](specs/payment-ledger.md): append-only credit
ledger in integer minor units with journal provenance, accrued→approved→submitted→
settled pipeline with idempotent payout batches, no-silent-zero-pay-paths boot rule,
`forTime` fairness helper (pause time counts as active), budget cap on intake, and
redaction-safe credits with identifier-only reasons. Multi-currency deferred.

### A6. Failure UX for participants (blocking: 08, 10) — **DRAFTED**
Resolved in [specs/failure-ux.md](specs/failure-ux.md): the full transient-state
component table (reconnect, pause, barriers, grace, task-pending, REPLACED), exit-path
screens with structural code+payment lines (anti-dark-pattern), peer-transparency
defaults (counts not names), client error-boundary + crash-loop handling, and the
shared state taxonomy feeding admin session-health. Offline input queueing tracked as
a sub-question (→ 08).

### A7. Withdrawal/redaction mechanics (blocking: 05) — **DRAFTED** ⚖
Resolved in [specs/redaction.md](specs/redaction.md): destroy-content/preserve-
structure table across all stores, identity deletion → pseudonymization, collab docs
as collective works (strict destroy mode optional), backup-generation rotation with
retention-window erasure, `verify-redaction` audit command, simulation drills.
**Blocked on external legal review** for the pseudonymization stance, collective-work
default, and backup retention language — the one A-item that cannot freeze in-house.

### A8. Observability (blocking: 15) — **DRAFTED**
Resolved in [specs/observability.md](specs/observability.md): structured JSONL logs
with an *enforced* keys-not-values content rule, Prometheus metrics set, eight derived
session-health conditions (journaled, webhookable — the researcher gets paged, not a
dashboard), journaled boot report, optional content-free Sentry adapter. OTel traces
deferred with mappable fields.

### A9. Naming freeze (blocking: everything user-facing)
One pass over every public name (player/group/run/node/stage/allocation/intake,
hook names, CLI verbs) optimizing for LLM ergonomics: unambiguous, greppable,
collision-free with common libraries. Cheap now, impossible later.

### A10. i18n & accessibility baseline — **DRAFTED**
Resolved in [specs/i18n-and-a11y.md](specs/i18n-and-a11y.md): ICU catalog for stock
strings with per-deployment overrides, Intl + timezone-labeled gate copy, RTL via
logical properties, WCAG 2.1 AA baseline with axe-core CI, and the placeholder-content
build guard (the Napoleon-quiz rule).

### A11. Engine-upgrade policy (blocking: 11) — **DRAFTED**
Resolved in [specs/versioning-and-upgrades.md](specs/versioning-and-upgrades.md): the
six-part version tuple, bundle-pins-engine, boot-never-migrates, the mid-study deploy
matrix, export-reads-every-format-forever guarantee (v2's failure inverted), semver
deprecation with llms.txt regeneration, and the one-way v2 importer stance.

### A12. Standby lifecycle (blocking: 03) — from F7 — **DRAFTED**
Resolved in [specs/standby.md](specs/standby.md): dormancy as an engine concept
(excluded from visibility audiences and barriers), FIFO promotion with atomic
role-swap + view backfill and no silent state inheritance, releaseAfter triggers with
paid `standbyReleased` exit, post-release fallback to the dropout tier.

## B. Spikes — throwaway code to retire risk before freeze

| # | Spike | Retires the risk that… | Exit criterion |
|---|---|---|---|
| S1 | Bun command loop: `bun:sqlite` WAL + single-writer txn loop + `Bun.serve` pub/sub under simulated load (1k conns, 200 cmd/s) | Bun/runtime perf assumptions are wrong | p99 command < 20ms; no leak over 1h |
| S2 | `bun build --compile` embedding client dist + admin assets; boot from single file | The sealed bundle isn't actually achievable | one-file binary serves the SPA |
| S3 | Litestream drill: kill mid-write, point-in-time restore, verify cursor resume | Backup story has a hole | zero committed-loss restore, documented runbook |
| S4 | Replay transport prototype: journal → transport → real client bundle rendering historical state | Scrubbing is harder than theorized | scrub a recorded toy session |
| S5 | Yjs relay: opaque update journaling + compaction + replay of a collaborative doc | Collab fields fight the journal | keystroke scrub of a shared essay |
| S6 | React per-field store: 500 live fields, chat at 20 msg/s, render-count assertions | Fine-grained subscription model doesn't scale in React | no extraneous re-renders; 60fps |
| S7 | Node-compat pass of S1 behind the platform seam | The Bun exit door is imaginary | same suite green on Node LTS |

## C. Process before implementation

1. Resolve A-items → update docs → mark Frozen (each doc lists its blockers above).
2. Run spikes S1–S7 (parallelizable; S1 first — everything leans on it).
3. Write V1–V3 validation experiments on paper at full fidelity
   ([13](13-reference-experiments.md)); adjust docs where they creak.
4. Naming freeze (A9) last, once all surfaces exist on paper.
5. Then: [15-development-plan.md](15-development-plan.md).

## Decision log

| # | Decision | Where argued | Status |
|---|---|---|---|
| D1 | Single-process TS; engine+logic+storage share transactions | 01, 04 | Accepted |
| D2 | SQLite, journal + materialized state, same txn | 05 | Accepted |
| D3 | Closed node algebra (5 types), open policies | 03 | Accepted |
| D4 | Group as the sole sharing primitive; kinds; multi-membership | 02 | Accepted |
| D5 | Sync-only hooks; effects for async; `task` nodes | 04 | Accepted |
| D6 | Schema-declared visibility/writability; default self/server | 06 | Accepted |
| D7 | No privileged "classic" layer; sugar in userland templates | 08, 11 | Accepted |
| D8 | Commands/queries as the one API; REST + WS equal | 07 | Accepted |
| D9 | Bun-first with platform seam; drop only on demonstrated breakage | 11 | Accepted |
| D10 | Deterministic engine; simulation + replay in v1 core | 04, 09 | Accepted |
| D11 | One experiment per deployment; no multi-tenant hub in core | 00 | Accepted |
| D12 | CRDT collab as opt-in field type, never foundational | 08 | Accepted |
| D13 | kv-row state (not typed columns); export views repay queryability | 05 | Accepted |
| D14 | Redaction-in-place for withdrawal; no journal hash-chain in v1 | 05 | Proposed |
| D15 | No per-field visibility predicates in v1 (audience = groups) | 06 | Proposed |
