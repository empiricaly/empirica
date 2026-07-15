# Empirica v3

A deterministic, single-process engine for real-time multiplayer behavioral
experiments: define an experiment as typed TypeScript (schema + flow + hooks),
run thousands of concurrent participants on one node backed by one SQLite file,
simulate entire sessions headless in milliseconds, replay and scrub any session
after the fact, and export analysis-ready data with full provenance.

Ground-up successor to [Empirica v2](https://github.com/empiricaly/empirica).
Not backward compatible; a one-way importer keeps v2 data analyzable.

## Status

**Design frozen (2026-07-15); implementation starting.** The complete design —
architecture, specs, validated reference experiments, spike measurements, decision
log — lives in [`design/`](design/README.md) and is the contract this codebase is
built against. Start there.

- Architecture in one line: a single-writer command loop over SQLite (WAL) where
  hooks run exactly once inside the causing transaction; a closed five-node flow
  algebra with open policy slots; schema-declared visibility/writability enforced
  at the engine; per-field sync with cursor resume; deterministic replay from a
  journaled command log.
- All 7 pre-implementation spikes passed (command-loop latency, sealed single-file
  bundles, backup/restore, replay scrubbing, CRDT collab journaling, per-field
  React stores, Node runtime parity): [`design/spikes/`](design/spikes/).

## Layout

```
design/        the frozen design docs, specs, validations, spikes
packages/      engine · server · client-core · react · cli · admin
conformance/   cross-package acceptance suites (definition of done)
AGENTS.md      conventions for (mostly LLM) implementers
```

## Development

```sh
bun install
bun run typecheck && bun run lint && bun test
```

Node 22 LTS is a supported runtime for the engine via the platform seam
(`packages/engine/src/platform/`); CI keeps the compat job green.
