# 00 — Vision

Status: Draft

## What this system is

An engine for running **protocols over groups of humans, in real time, with scientific
integrity**. Researchers define an experiment as code; participants join through a
browser; the engine moves them through solo and group-synchronized phases, forms groups
under controlled randomization, records everything with provenance, and produces
analysis-ready data.

Empirica v1/v2 proved the demand and the general shape. This design keeps the *mission*
and rebuilds the model and machinery from first principles.

## First-principles requirements

Everything in the design must trace back to one of these needs:

1. **Controlled conditions & randomization.** Assignment of participants to conditions
   and to each other is a scientific instrument: block randomization, stratification,
   counterbalancing, quotas. It must be exact, auditable, and controllable by the
   researcher — not an emergent property of arrival timing.
2. **Synchronization of humans in time.** The hard, differentiating problem: barriers,
   lobbies, shared timers, simultaneous reveal, dropout handling, re-matching. Solo-only
   survey tools exist; this engine exists because groups are hard.
3. **Provenance & auditability.** Every state change recorded: who/what caused it, when,
   in which code version. Sessions must be replayable. The dataset must be defensible to
   reviewers, IRBs, and replicators years later.
4. **Participant welfare & ethics workflow.** Consent as a first-class record, withdrawal
   honored (including data deletion obligations), fair payment computation, screening and
   attention checks without dark patterns.
5. **Data integrity.** Participants are semi-adversarial (bored, confused, or actively
   cheating via devtools). Clients must be unable to write what they shouldn't write or
   read what they shouldn't read. Validation happens at the door.
6. **Live operability.** Studies are babysat. Operators need real-time visibility and
   surgical interventions: extend a timer, replace a dropout, close intake, message a
   group — every intervention audited.

## Product requirements

- **Trivial to develop.** `bun create empirica` → running experiment in one command.
  One language (TypeScript) end to end. Typed from schema to React hook.
- **Trivial to deploy.** One sealed executable + one SQLite file + continuous offsite
  backup. One-command deploy to a managed host; always possible to run on any box.
- **Performant on one node.** Thousands of concurrent participants on a single server.
  Scale-up, not scale-out. (v2's practical ceiling was ~10 players per game, limited by
  races, not throughput.)
- **LLM-first authorship.** We assume most experiment code will be written by LLMs:
  - a small, orthogonal, fully-typed API that fits in a context window (shipped as
    `llms.txt`);
  - a deterministic simulation harness as the development feedback loop;
  - all convenience code visible in the user's project (greppable, no hidden magic);
  - a library of runnable canonical experiments to remix;
  - errors that state the fix.
- **Bots and LLM participants are first-class.** The same participant API serves test
  bots, standby fill-ins, and LLM agents as experimental subjects — a major current
  research direction, supported natively rather than via browser puppeteering.

## Non-goals

- **Not a generic real-time sync backend.** v2's Tajriba was maximally generic and
  therefore impossible to steer, index, or build UI for. This engine is opinionated;
  generality lives in designated policy slots.
- **Not scale-out / multi-region.** One writer, one node, one experiment per deployment.
  A fleet-management layer may come later, above the engine, not inside it.
- **Not a survey platform.** Solo studies are supported (and cheaper than in v2), but
  Qualtrics is not the competition; group dynamics are the reason to exist.
- **Not backward compatible.** v2 experiments are not portable. A one-way importer keeps
  old *data* analyzable. Concepts remain recognizable where they earned it
  (treatments/factors are standard experimental-design vocabulary).

## Success criteria for the design phase

1. The three validation experiments ([13](13-reference-experiments.md)) are expressible
   at `experiment.ts` fidelity without engine escape hatches.
2. The admin UI can render all three from the flow algebra alone, with no
   experiment-specific admin code.
3. The listed spikes ([14](14-design-backlog.md#spikes)) pass.
4. Every doc in this directory is Frozen, and the open-questions list is empty or
   explicitly deferred with rationale.
