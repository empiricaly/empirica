# Empirica v3 — project context

Single-process TypeScript engine for real-time multiplayer behavioral experiments.
Successor to empiricaly/empirica (v2); not backward compatible.

## State of the project

- **Design: FROZEN 2026-07-15.** `design/` is the contract: numbered docs (00–15),
  normative specs (`design/specs/`), validated reference experiments
  (`design/validation/` — V1–V3 are contract canaries), passed spikes with
  measurements (`design/spikes/`, 7/7 PASS), decision log D1–D28 + Deferred
  register (`design/14-design-backlog.md`).
- **M0 (skeleton): done.** Bun workspace, strict TS references, determinism lint
  walls, platform seam (spike-proven), CI (bun + node-compat), conformance
  workspace. `bun install && bun run typecheck && bun run lint && bun run test`
  must stay green.
- **M1 (engine): next.** All six package specs are written
  (`design/packages/*.md`). Milestones and gates: `design/15-development-plan.md`.
- Outstanding external item: legal review of `design/specs/redaction.md`
  (`design/legal-review-brief.md` is the counsel handoff). Do not implement
  redaction mechanics beyond the spec while it is pending; everything else is
  unblocked.

## Hard rules (details in AGENTS.md — read it before writing code)

1. Specs are the contract; conformance tests are the definition of done and are
   written BEFORE implementation. Changing either requires a decision-log entry
   (D-entry) in `design/14-design-backlog.md`.
2. Names come from `design/specs/naming.md`. Banned synonyms are bugs.
3. Determinism walls in `packages/engine` (no `Date.now`/`Math.random`/argless
   `new Date`) are ESLint errors — never disable them.
4. SQLite and WebSockets are touched ONLY through
   `packages/engine/src/platform/seam.ts`; the Node exit door (spike S7) must
   stay green in CI.
5. Storage runtime config is measured law (`design/05-storage.md` §Runtime
   configuration): WAL, `synchronous=NORMAL`, `wal_autocheckpoint=0`,
   checkpointer worker, `busy_timeout`, prepared-statement reuse.
6. Logs carry field keys, never participant values.

## Work order for M1 (from design/15-development-plan.md)

1. Author conformance suites in `conformance/` from the BR lists in
   `design/packages/engine.md` (every BR number appears in ≥1 test name).
   Suites run red against stubs — that is correct.
2. Implement `@empirica/engine` module by module
   (`schema/ → store/ → loop/ → flow/ → matchers/ → effects/ → project/ →
   ledger/ → redact/ → sim/`) until suites are green.
3. Gate: V1–V3 (`design/validation/`) transcribed to real `experiment.ts` files
   and running green in simulation — the milestone exit test.
4. Then M2 (server) per its spec. Never start a package before its spec's suites
   exist.

## Useful commands

```sh
bun install
bun run typecheck && bun run lint && bun run test
bun test conformance          # the definition of done
```
