# Fresh-repo kickoff (delete this file after use)

## Pre-flight checklist (human, once)

- [ ] Copy the contents of `v3/` from the old branch to this repo's root
      (plain copy is fine; MIGRATION.md's subtree-split is only needed if you
      want the directory's git history).
- [ ] Delete `MIGRATION.md` and this `KICKOFF.md` once used.
- [ ] Confirm LICENSE (currently Apache-2.0, copied from v2) — change now if ever.
- [ ] Enable Actions; protect `main` (require CI green; PRs for everything).
- [ ] Optional now / needed by M6: Prolific sandbox account, an S3-compatible
      bucket for backup drills, Anthropic API key for LLM-bot work — all as
      repo/deploy secrets, never in code.
- [ ] Send `design/legal-review-brief.md` to counsel (only blocks redaction
      implementation, nothing else).
- [ ] Verify green locally: `bun install && bun run typecheck && bun run lint && bun run test`.

## Kickoff prompt for the first session (paste as-is)

> Read CLAUDE.md, then AGENTS.md, then design/README.md. The design is frozen;
> your job is M1 per design/15-development-plan.md and CLAUDE.md's work order.
>
> Start by authoring the conformance suites in conformance/ from the 30
> behavioral requirements in design/packages/engine.md — tests before
> implementation, every BR number in at least one test name, suites red against
> the current stubs. Commit the suites. Then implement @empirica/engine module
> by module until they are green, in reviewable PR-sized commits.
>
> Use parallel subagents/workflows for suite authoring and for independent
> engine modules where dependencies allow. Anything that requires changing a
> frozen spec or a conformance test: stop and surface it as a proposed
> decision-log entry instead of coding around it. The milestone exit is V1–V3
> from design/validation/ running green as real simulations.

## What "done" looks like for M1

`bun test conformance` green including determinism (3-seed replay hash), races,
chaos (kill -9 drills), flow invariants, barriers, schema, privacy-projector,
ledger, redaction suites — and the three validation experiments simulating
end-to-end. See design/packages/engine.md §3.
