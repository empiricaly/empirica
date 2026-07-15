# Package specs — M0/M1 framework

Status: Active (post-freeze). This directory holds the per-package implementation
specs the autonomous build executes against. The frozen design docs are the *what*;
these are the *contract per package*: exact public surface, behavioral requirements
as executable acceptance criteria, and explicit dependencies.

## Packages and build order

| Package | Depends on | Contents | Spec |
|---|---|---|---|
| `@empirica/engine` | — (pure; no I/O, no sockets) | schema DSL, kv/journal/changes on SQLite (via seam), command loop, timers, flow executor, matchers, effects runtime, sim harness, bots | `engine.md` (next) |
| `@empirica/server` | engine | WS/REST transport, views & fanout, auth, checkpointer, boot report, metrics | `server.md` |
| `@empirica/client-core` | — (protocol only) | transport seam, mirror store, command queue, offline queue, clock offset | `client-core.md` |
| `@empirica/react` | client-core | hooks, stock components, error boundary | `react.md` |
| `@empirica/cli` | all | create/dev/simulate/build/deploy/export/migrate/archive/verify-redaction | `cli.md` |
| `@empirica/admin` | client-core, react | algebra-driven UI, interventions, replay pane, ledger review | `admin.md` |

Platform seam (S1/S7-proven, ~180 lines) lives in engine as `platform/` with bun and
node implementations; everything above it is runtime-agnostic.

## Spec template (every package spec MUST have)

1. **Public surface** — every exported name with full TS signature (names per the
   frozen naming spec; any new name requires a glossary entry first).
2. **Behavioral requirements** — numbered, each traceable to a frozen doc/spec
   section ("BR-12 ← flow spec §2.4").
3. **Acceptance tests** — the conformance suites this package must pass, written
   BEFORE implementation. Suites live in `conformance/` at the monorepo root and
   are the definition of done; a PR that changes a conformance test is a design
   change and needs a D-entry.
4. **Non-goals** — what this package explicitly does not do (the altitude guard).
5. **Internal design notes** — non-binding hints (the implementer may deviate;
   the surface and tests may not).

## Conformance suite index (consolidated from the frozen specs)

| Suite | Source | Gates |
|---|---|---|
| determinism (replay hash ×3 seeds) | 04, 09 | engine |
| race conformance (v2 failure scenarios as property tests) | 04, flow spec §9 | engine |
| chaos (kill -9 matrix, timer re-arm, effect re-verify) | 04, 05 | engine, server |
| flow invariants P1–P3 (arrival/departure/timeout interleavings) | flow spec | engine |
| barrier/submit-retract semantics incl. STALE_RUN | flow spec §2.4 | engine |
| schema boot-validation + evolution matrix | schema spec §9, versioning spec | engine |
| privacy leak (wire-level, every reference experiment) | 06 | engine, server |
| resume equivalence + restore-epoch | wire spec §4 | server, client-core |
| golden transcripts + protocol fuzz | wire spec §9 | server, client-core |
| render granularity + snapshot identity | 08 (S6 constraints) | react |
| ledger invariants + payout idempotency | payment spec §5 | engine, cli |
| redaction drill + log scan | redaction spec §6 | engine, cli |
| a11y (axe) + placeholder guard | i18n spec §4 | react, cli |
| export goldens + format-fixture matrix | 05, versioning spec §3 | cli |
| operator drills (scripted admin interventions) | 10 §Acceptance | admin |
| E2E: V1–V3 simulate green + human-playable | 13 | all |

## Process for the autonomous build

1. Write `engine.md` first (largest, zero-I/O, most parallelizable) — then the other
   five, which mostly consolidate already-frozen material.
2. For each package: spec review → conformance tests authored → implementation
   agents fan out → suite green → human gate.
3. Repo conventions doc (code style, error-message style, lint walls:
   no-`Date.now()`/no-`Math.random()`/no-`await`-in-hooks, PR size, doc-comments
   feeding generated docs + `llms.txt`) ships alongside `engine.md`.
