# Conventions for implementers (human and LLM)

This repo is built spec-first by many agents in parallel. These rules are the
contract that keeps that safe. They are enforced by CI where possible and by
review where not.

## Ground rules

1. **The spec is the contract.** Each package implements `design/packages/<name>.md`.
   The public surface (names + signatures) and the conformance tests may not be
   changed by an implementation PR. If the spec is wrong, stop and file a
   decision-log entry (`design/14-design-backlog.md`) — do not "fix it in code".
2. **Conformance tests are the definition of done.** They are written before
   implementation and live in `conformance/`. A PR that edits a conformance test is
   a design change and needs a D-entry in its description.
3. **Names come from the glossary** (`design/specs/naming.md`). A new exported name
   requires a glossary entry first. Banned synonyms fail CI lint.
4. **Determinism walls** (mechanically enforced in `packages/engine`):
   no `Date.now()`, no `Math.random()`, no argless `new Date()` — use `ctx.now` /
   `ctx.rng`. Hooks are synchronous: an `async` hook or an `await` inside one is a
   type error, not a style violation.
5. **The platform seam is sacred** (`packages/engine/src/platform/seam.ts`):
   engine/server code touches SQLite and WebSockets ONLY through it. Both spike
   reference implementations (S1 bun, S7 node) must stay expressible against it.
6. **Storage discipline**: WAL, `synchronous=NORMAL`, `wal_autocheckpoint=0`,
   checkpointer worker (PASSIVE ~1 s / RESTART ~10 s), `busy_timeout` on the
   writer, prepared-statement reuse. This is measured law (spike S1), not taste —
   see `design/05-storage.md` §Runtime configuration.
7. **Logs carry keys, never values** (`design/specs/observability.md` §1). Passing
   participant content to a logger is a bug even when convenient.

## Style

- TypeScript strict; no `any` on public surfaces; plain functions over classes
  unless state demands otherwise; no default exports except `experiment.ts`
  authoring convention.
- Error messages state the fix: "field `guess` is not writable by clients — add
  `.writable('self')` in the schema or use a command" beats "permission denied".
- Comments state constraints the code can't ("closed here because the barrier and
  timer converge on endStage — flow spec §2.4"), never narration.
- Public API doc-comments are load-bearing: they feed generated docs and
  `llms.txt`.

## PR discipline

- One package (or one conformance suite) per PR; keep diffs reviewable (< ~600
  lines of non-test code).
- PR description links the spec sections implemented (BR numbers) and the suites
  turned green.
- No dependency additions without a D-entry (the dependency budget is part of the
  design: engine core has zero runtime deps beyond the platform).

## Milestone gates (design/15-development-plan.md)

Human review happens at: package-spec sign-off, milestone boundaries, any D-entry,
security-sensitive surfaces (auth, redaction, payment). Everything else is
agents + CI.
