# 04 — Engine: commands, transactions, hooks, effects, timers

Status: Draft

## The command loop

Everything that changes state is a **command**: client actions (field writes, custom
commands, step completions), timer firings, matcher triggers, admin interventions,
effect completions, webhook deliveries. One logical writer processes commands in order:

```
validate → authorize → BEGIN
  → apply state changes
  → run hooks (synchronous, may enqueue further changes in the same txn)
  → append journal (events + per-field changes)
COMMIT → broadcast patches → launch effects
```

Guarantees (the point of the design):

1. **Exactly-once hooks.** No replay, no idempotency guards, no v2 `ran-*` markers.
2. **Single-site transitions.** A stage ends in one place. Timer expiry, last-submit,
   and admin-end are three commands entering one serialized queue; the second is a clean
   no-op by state check, not a swallowed error.
3. **Atomic failure.** A throwing hook rolls back the entire command. A bug in scoring
   rejects one command loudly instead of wedging a group between stages.
4. **Total order.** The journal sequence *is* the causal order of the experiment.

Backpressure: per-connection rate limits at intake; command classes (timer/admin >
gameplay > chat-append) so a spammy channel cannot starve stage transitions.
Hook execution budget: warn at 5ms, hard-fail at a configurable ceiling — slow work
belongs in effects.

## Hooks: synchronous, in-transaction

Hooks attach to flow-node lifecycle (`onEnter`/`onExit`/`onTimeout` per node, stage
boundaries) and to field changes. They are **synchronous functions — `await` is a type
error**. With a synchronous SQLite driver this costs nothing and buys:

- determinism (no interleaving mid-hook),
- atomicity (the v2 documented footgun — an `await` mid-callback triggering a surprise
  flush that splits "atomic" updates — becomes unrepresentable),
- an LLM guardrail that cannot be wandered past.

Hooks receive `ctx` with:

- `ctx.now` — the command's timestamp (never wall clock),
- `ctx.rng` — seeded from `(deployment seed, journal seq)`,
- typed accessors for the entities in scope,
- `ctx.effect(...)` and flow controls (`advance`, `route`).

## Effects: the async door

Anything slow or fallible — LLM calls, Prolific payments, email, external fetches — is an
**effect**: enqueued in-transaction, executed post-commit by a supervised runner with
retries and an idempotency key; its *result re-enters as a command*.

Two authoring shapes:

**1. Explicit continuation** (result lands mid-phase):

```ts
onStageEnd('pitch', (ctx, { group, run }) => {
  group.set('judging', true);
  ctx.effect('llm.judge', {
    key: `judge:${run.id}`,                 // idempotency
    input: { prompt: buildPrompt(group) },
    onResult: 'judgeReturned',              // a command name
  });
});

command('judgeReturned', (ctx, { group, result }) => {  // later, its own txn
  group.set('verdict', result.text);
  group.set('judging', false);
});
```

**2. `task` node** — when the experiment *waits* on the external thing, it is a flow
position, not a callback problem:

```ts
task('judge', {
  run: async (ctx, group) => ctx.llm.generate(buildPrompt(group)),  // async is fine HERE
  into: 'verdict',                    // result lands in run state
  timeout: '30s',
  onFail: branch.to('manualReview'),
})
```

The group sits at the node (clients render it like any stage), the runner executes with
retries, the result commits, flow advances. Docs push the task-node shape for the 90%
case; continuations are for fire-and-forget and mid-stage enrichment.

Effect runtime: concurrency limits per effect type; exponential backoff; dead-letter
queue surfaced in the admin ([10-admin.md](10-admin.md)); secrets injected from
deployment config, never stored in state. Replay treats effects as recorded
input/output pairs ([09](09-simulation-and-replay.md)) — they are the non-deterministic
boundary, so their results are journaled.

## Timers

Rows: `timers(id, fires_at, command payload)`. The engine arms the soonest; on restart it
re-arms from the table — crash-safe. Stage deadlines, lobby timeouts, disconnect grace,
and day-2 gates are the same mechanism. Pause/extend is an ordinary admin command
mutating the row, which makes "give this struggling group two more minutes" a button.
Timer resolution target: 100ms (sufficient for behavioral experiments; declared limit).

## Determinism & replay contract

Given: the journal of commands (with timestamps), the deployment seed, and journaled
effect results — replaying commands through the engine reproduces state and every
patch, byte-for-byte. Enforced by construction:

- no `Date.now()` / `Math.random()` in engine or hooks (lint + runtime guard; `ctx.now`,
  `ctx.rng` only),
- effects journaled at the boundary,
- schema-versioned state ([05-storage.md](05-storage.md)).

This contract powers simulation, session scrubbing, and production forensics
("send me the DB file").

## Custom commands — the userland power tool

Raw field writes (`writable('self')` + schema validation) are the built-in trivial
command. Authors define richer ones:

```ts
commands: {
  bid: {
    input: z.object({ amount: z.number().positive() }),
    handler: (ctx, { player, input }) => {
      const pair = player.group('pair');
      if (pair.get('phase') !== 'bidding') throw reject('not in bidding phase');
      pair.member(player).set('bid', input.amount);
    },
  },
}
```

Same transaction, same journal, same auth pipeline; callable from WS and REST alike
([07-api.md](07-api.md)). This is how real game actions (bids, votes, trades) get
server-validated logic instead of attribute choreography — and a designated place for
the "slightly more complex API, a lot more power" trade.

## Acceptance criteria

- Chaos test: `kill -9` at random points under simulated load → restart → zero lost
  committed state, timers re-armed, clients resume via cursors.
- Determinism test: same journal + seed replayed twice → identical state hash and patch
  stream.
- Race conformance: the v2 failure scenarios (double-assign, overfill, null-timer stage
  end, triple stage-end) encoded as property tests that cannot fail by construction.
- Throughput floor: 1,000 simulated concurrent players, ~200 commands/sec sustained,
  p99 command latency < 20ms on one modest node.
