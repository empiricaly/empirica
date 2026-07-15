# Package spec — @empirica/engine

Status: Ready for review (gates M1 implementation). Template per
[README](README.md). Everything here consolidates the frozen specs; nothing is
newly decided. Traces use `←` (e.g. `← flow §2.4`).

## 0. Scope in one paragraph

The engine is the **pure core**: schema, storage, command loop, flow execution,
matching, effects runtime, view projection, and the simulation harness. It performs
**no I/O except through the platform seam** (SQLite) and **owns no sockets, HTTP,
or React** — the server package feeds it commands and transports its patches. It
must run identically under Bun and Node (seam), and identically against a file DB
(production), in-memory DB + virtual clock (simulation), and the journal (replay).

## 1. Public surface

### 1.1 Authoring (re-exported by the umbrella for `experiment.ts`)

```ts
defineExperiment(def: ExperimentDef): Experiment
defineSchema(def: SchemaDef): Schema
field(z: ZodType): FieldBuilder          // .default .visible .writable .ephemeral .label .showInAdmin
list(item: ZodType, opts?: {max?}): ListBuilder     // .visible .append
record(value: ZodType): RecordBuilder    // .keys('members') .refine
field.collab(opts: {schema: 'prosemirror'|'plain'|'map'}): CollabBuilder

flow: { seq(...nodes), }                 // composition
repeat(n: number | While, body: Node): Node;  repeat.while(pred): While
branch(pred, a: Node, b?: Node): Node
step(name, cfg?: StepCfg): Node          // validate?, maxDuration?, onTimeout?
gate(name, cfg?: GateCfg): Node          // until?, reminders?, deadline?, reentry?
match(name, policy: MatcherPolicy, cfg?: MatchCfg): Node
phase(name, cfg: PhaseCfg): Node         // stages | (ctx,{group})=>stages, submatch?, onDisconnect?, hooks
stage(name, cfg?: StageCfg): StageDef    // duration?, advance?, retractable?, hooks
task(name, cfg: TaskCfg): Node           // run, into, timeout?, onFail?, retries?

groups: { fixedSize(cfg), backfill(cfg), create /* plural kinds, via ctx */ }
pairs(kind, cfg): SubmatchDef            // within, constraint[], roles
byRole(a,b) · noRepeat() · roundRobin() · randomPerfect()   // constraints
balanced() · stratified({by}) · sequence(list)              // treatment strategies

ok() · retry(meta?) · route(path) · abort(path) · reject(code, msg?)
usd(n) · days(n) · f.player(k) · f.group(kind,k) · f.node(name,k) · f.global(k)
```

All names ← naming spec (frozen); signatures here are the binding elaboration.

### 1.2 Runtime

```ts
createEngine(experiment: Experiment, opts: {
  platform: SqliteDriver,                // seam; caller opens the DB
  clock: Clock,                          // real | virtual — engine never reads wall time
  seed: string,
  onPatchBatch(batch: PatchBatch): void, // per-audience-class serialized patches
  onEffect(req: EffectRequest): void,    // server/sim runs it, returns via dispatch
}): Engine

interface Engine {
  boot(): BootReport                     // validate schema↔flow, re-arm timers, report
  dispatch(cmd: Command): Ack            // THE single entry; sync; one txn per call
  view(playerId, sinceSeq?): Snapshot | Diff      // projection (also serves replay)
  tick(now: Timestamp): void             // fire due timers (clock integration)
  close(): void
}

simulate(experiment, opts: {players, seed, botMix?, latency?}): Sim   // ← 09
```

`dispatch` is synchronous and single-threaded by contract; the server provides the
queue. Command/Ack/Patch shapes ← wire spec §2–3 (engine emits them; server frames
them).

### 1.3 Hook-visible API (`ctx` and handles)

Handles `Player/Group/Membership/Run/PlayerRun` and `ctx` exactly per schema spec
§7 (get/set, group(kind)/groups(kind), members, subgroups, list, run.sibling,
run.phase, ctx.at, ctx.now, ctx.rng, ctx.effect, ctx.pay.credit/void/forTime,
ctx.redact, ctx.log, ctx.groups.create). Handles are transaction-scoped; escaping
one is a type error (no handle type is Promise-compatible).

### 1.4 Re-exports

Platform seam types (`SqliteDriver`, …) from `platform/seam.ts`; zod re-exported
as `z` (single validation namespace ← naming spec).

## 2. Behavioral requirements (each → conformance test(s))

**Command loop** — BR1 exactly-once hooks, in-txn, rollback-on-throw with typed
rejection ← 04. BR2 total order = journal seq; ack carries commit seq ← 04, wire
§5. BR3 rejection taxonomy complete and journaled-without-state-change ← flow §8.
BR4 hook budget: warn 5 ms, fail at ceiling; sync-only enforced by types ← 04.

**Storage** — BR5 tables and layers exactly per 05 (core, kv+lists+collab, events+
changes, timers, effects, credits, snapshots); same-txn journal+state. BR6 boot is
O(state): no history replay; timers re-armed from table ← 05. BR7 PRAGMA discipline
+ checkpointer contract exposed as engine API (`Engine.checkpoint()` called by
server's worker) ← 05 §Runtime config (S1). BR8 `bundle_hash` stamped on every
event ← 05/11.

**Flow** — BR9 invariants P1–P3 under arbitrary interleavings ← flow §1.
BR10 per-node semantics: step validate ok/retry/route; per-unit gates with at/when/
built-ins, reminders-once, deadline routes, pause-shifts ← flow §2.1–2.2, D20.
BR11 matcher: pool events, atomic decision application, invalid-decision rejection
surfaced, unsatisfiable-constraint alerting ← flow §2.3. BR12 phase: resolved-stages
journaled per run; submatch lifecycle bound to run; two-tier dropout matrix;
dormant standby exclusion ← flow §2.4, standby spec. BR13 barriers: submitted-state
semantics, retract, `allOf(kind,pred)`, STALE_RUN on late commands, single-site
endStage ← flow §2.4/D16. BR14 segments computed at boot; solo-in-segment and
match-before-solo are boot errors; segment-purity for branches ← flow §3.3/D19.
BR15 exit paths: declared-only, terminal, onExit credits/redact, implicit finished,
unreachable-path warning ← flow §5. BR16 flow versioning: structure-hash comparison,
refuse-or-finalize ← flow §7.

**Schema/state** — BR17 boot validation matrix ← schema §1. BR18 validation on
every write path (client sets AND hook sets — hooks can violate zod too; both
reject) ← schema §5. BR19 defaults-at-creation as system changes; absence readable
← schema §3. BR20 list attribution; caps ← schema §6/§2. BR21 plural kinds:
context-only enforcement, plural accessors, union visibility ← schema §1/D17.
BR22 evolution matrix additive/destructive ← schema §9.

**Visibility/projection** — BR23 view computation is THE single projector used by
live patches, `view()`, and replay (view-space old values) ← 06, S4. BR24 patches
serialized once per audience class; atomic membership backfill/eviction ← 06.
BR25 zero transmission of non-visible fields (wire-level leak suite drives this
through `onPatchBatch`) ← 06.

**Effects/tasks** — BR26 registry + inline task declarations; validated input;
restricted `fx` context (no handles); journaled request/response; idempotency keys;
retry/timeout/onFail; boot re-verification ← 04, flow §2.5.

**Determinism/replay** — BR27 journal+seed+effect-results → byte-identical state
and patch stream; ctx.now/ctx.rng only sources ← 04/09. BR28 state-at-seq
reconstruction (inverse-backward + keyframes) ← 09, S4.

**Ledger/redaction** — BR29 credit ledger invariants, oncePerRun guard, forTime
(pause counts active) ← payment §1–3. BR30 redact: one-txn tombstone table per
redaction spec §2, credential revocation callout to be honored by server, seq-bump
patches to live viewers, snapshot invalidation ← redaction, D28 hook for the log
scan lives in CLI.

## 3. Acceptance suites owned (conformance/)

determinism · races · chaos (with server for socket half) · flow-invariants ·
barriers · schema · privacy (projector half) · ledger · redaction · plus the
E2E simulate-green gate for V1–V3 ← packages/README index. Suites are authored
from the BR list above before implementation; every BR number appears in at least
one test name.

## 4. Non-goals

No sockets, HTTP, auth, framing (server). No React, no DOM (client/react). No
file-system layout, bundling, export files (cli). No wall-clock reads, ever. No
ORM. No runtime deps beyond zod + the platform seam.

## 5. Internal design notes (non-binding)

- Single-writer loop shape, prepared-statement registry, and checkpointer cadence:
  start from spike S1's `server.ts`/`checkpointer.ts` (proven numbers) — the spike
  is reference code, not vendored code.
- kv hot-path: primary key (entity_type, entity_id, key); `updated_seq` index is
  the sync cursor; deferred `BEGIN` (S1: IMMEDIATE ~25% slower single-writer).
- Projector: maintain per-connection view sets keyed by audience class; group
  viewers by class before serialization (S4/S6 identity constraints apply to the
  patch shapes).
- Virtual clock = `tick()` driven by the sim jumping to the next timer row; the
  engine must never schedule host timers itself (that's server/sim).
- Suggested module map: `schema/ · store/ · loop/ · flow/ · matchers/ · effects/ ·
  project/ · ledger/ · redact/ · sim/ · platform/`.
