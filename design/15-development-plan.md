# 15 — Development plan: the path to autonomous implementation

Status: Draft

Objective: once the design freezes, implementation is executed largely by LLM agents,
with tests and documentation produced alongside code. This plan is about making that
*safe and steerable*: the design docs become per-package specs, the conformance suite
becomes the definition of done, and humans review at milestone gates.

## Preconditions (from [14-design-backlog.md](14-design-backlog.md))

1. All A-items resolved; docs Frozen.
2. Spikes S1–S7 green.
3. V1–V3 validation experiments written on paper at full fidelity.
4. Naming freeze done.

## The contract structure for agent-driven work

- **One spec per package**, derived from these docs: exact public API (typed
  signatures), behavioral requirements, and **acceptance tests written before
  implementation**. The simulation harness makes spec-as-executable-test cheap — most
  behavioral requirements become sim assertions.
- **Conformance suite as the definition of done.** The acceptance-criteria sections in
  docs 03–12 are the seed. Key suites: determinism (replay hash), privacy (wire-level
  leak tests), race conformance (the v2 failure scenarios as property tests), chaos
  (kill -9 drills), protocol goldens, export goldens.
- **Repo conventions doc** for agents: code style, error-message style ("errors state
  the fix"), doc-comment requirements (public API comments feed generated docs and
  `llms.txt`), no-`Date.now()`/no-`Math.random()` lint walls, PR size limits, review
  checklist.
- **Human gates**: milestone boundaries + any change to a Frozen doc (goes through the
  decision log).

## Milestones

Each milestone ships green conformance + docs; later milestones never reopen earlier
packages except through the decision log.

**M0 — Spikes & skeleton** (already listed in 14): monorepo, CI (Bun + Node-compat
job), lint walls, the platform seam.

**M1 — Engine core (pure, no network).** `@empirica/engine`: schema/field DSL, kv +
lists + journal + changes on SQLite, command loop, timers, flow executor (all five
nodes), matcher framework + stock policies, effects runtime (mock transport), sim
harness + bot API. *Gate: V1–V3 experiments run headless in simulation; determinism,
race, and chaos suites green.* This is the largest and most parallelizable milestone —
and nothing in it touches a socket.

**M2 — Sync & server.** Views, audience-class fanout, patch protocol, cursors,
resume, auth, REST mirror, webhooks. *Gate: wire-level privacy suite; resume/chaos
under simulated 1k connections; generated OpenAPI validates.*

**M3 — Client & React.** client-core (transport seam, mirror store, optimistic
writes), React bindings, stock components (consent, steps, lobby, chat, timer), the
classic template with visible sugar. *Gate: V1 playable end-to-end by humans; latency
and render-granularity suites.*

**M4 — CLI & packaging.** create/dev/simulate/build/export; sealed bundle; deploy
adapters (fly, ssh, docker); Litestream wiring. *Gate: clean-machine
create→dev→build→deploy drill; restore drill.*

**M5 — Admin & replay.** Algebra-driven admin, interventions, replay/spectate pane.
*Gate: operator drill on all three validation experiments; every intervention
journaled.*

**M6 — Integrations.** Prolific adapter, payments, magic links, LLM provider adapter,
LLM bots. *Gate: Prolific sandbox end-to-end; V5 stretch validation.*

**M7 — Library & docs.** The shipped experiment library ([13](13-reference-experiments.md)),
tutorial track, generated API reference, `llms.txt`, MCP dev-server mode. *Gate: every
example green in CI (sim + leak + export goldens); a fresh LLM agent, given only the
docs + library, builds a novel working experiment in one session — the ultimate
acceptance test.*

**M8 — Hardening & release.** Load (1k concurrent), soak (24h chat churn, memory
flat), security pass (threat model: adversarial participants, scraping, DoS, token
theft), external pilot studies with friendly labs, v2 data importer.

## Sequencing & parallelism notes

- M1 is deliberately network-free: many agents can work in parallel against pure
  in-process tests without stepping on each other; it also front-loads the highest
  design risk.
- M2/M3 can overlap once the protocol goldens exist (M2 produces them; M3 consumes).
- The library (M7) starts as soon as M3 exists — each example is an independent
  agent-sized work unit with a crisp definition of done.

## What stays human

Design-doc changes, milestone gates, security review sign-off, pilot-study liaison,
release calls, and the taste calls: naming, error-message wording, template ergonomics.

## Documentation deliverables (not an afterthought)

- Generated API reference from typed source.
- Tutorial track (solo → classic multiplayer → custom flow).
- Operator handbook (deploy, backup, interventions, incident runbook from S3/chaos
  drills).
- `llms.txt` + machine-readable schema/OpenAPI + MCP dev-server — the LLM-facing
  surface, versioned with the engine.
- Migration guide for v2 users: concept mapping + data importer.
