# 09 — Simulation, bots, replay & scrubbing

Status: Frozen (2026-07-15)

The single feature this rewrite should be staked on. Same engine, three modes:

| Mode | Storage | Clock | Transport |
|---|---|---|---|
| Production | file SQLite | real, timer-driven | WebSocket |
| Simulation | in-memory SQLite | virtual (jump-to-next-timer) | in-process |
| Replay | journal (read) | scrubbed | journal-fed |

## Simulation

```ts
const sim = simulate(experiment, { players: 8, seed: 42 });
sim.bots.onStep('quiz',   b => b.complete({ answers: b.rng.pick(ANSWERS) }));
sim.bots.onStage('guess', b => b.player.set('guess', b.rng.int(0, 100)));
await sim.run();                          // full 10-round session in ~100ms
expect(sim.group('game', 0).get('winner')).toBeDefined();
expect(sim.export().players).toHaveLength(8);
```

- Virtual clock jumps to the next timer — a 30-minute session runs in milliseconds;
  latency/jitter injection available for realism tests.
- Deterministic: same seed → same session, byte-for-byte. A misbehaving seed is a
  permanent regression test.
- Wire-level assertions: the sim exposes each player's transport bytes, powering the
  privacy leak-tests ([06](06-sync-and-visibility.md)) and protocol golden tests.
- Effects are mocked by default (recorded fixtures); `sim.effects.llm = fake` or live.

For humans this is piloting without recruiting. **For LLMs this is the development
loop** — write → simulate → read typed failure → fix — which is why it ships in v1 core,
not as tooling later. `empirica simulate` is the CLI face of the same harness.

## Bots

One bot API across all uses:

- **Test bots** — drive simulations (above).
- **Production fill-ins** — standby role members that keep a group viable on dropout
  ([03-flow.md](03-flow.md)); same code as test bots, promoted by the matcher.
- **LLM participants** — bots whose decisions are `task`-node/effect-backed LLM calls;
  the substrate for LLM-subject and human-AI-team research. Python bots join over the
  participant protocol ([07-api.md](07-api.md)).

Bots are journaled as actors like any player — analysis can always separate them.

## Replay & the scrubber

From the determinism contract ([04](04-engine.md)) + `changes` log
([05](05-storage.md)) + the transport seam ([08](08-client.md)):

- **State at seq N** is reconstructible (snapshot + forward, or backward-walk from
  head — trivial at experiment data sizes).
- The admin's replay view mounts the **actual experiment client bundle** in a sandboxed
  pane, fed by the replay transport: pick a session, pick a player, scrub. Multi-pane
  "watch all four players side-by-side". The bundle hash in the journal means you replay
  with the *code that produced the data*, even years later.
- **Spectating live** is the same mechanism pointed at head (read-only view, admin
  gated).
- Not captured, by design: un-synced local state (half-typed text before submit) —
  documented limitation.
- Access control: replay exposes participant data; admin-gated, and respects redaction
  ([05](05-storage.md#withdrawal-vs-append-only-gdpr--irb)).

Uses: debugging ("send me the DB"), IRB audits, methods videos, reviewer responses
("here is exactly what participants saw"), teaching. No adjacent platform has this.

## Acceptance criteria

- Full reference-experiment session (4 players, 10 rounds) simulates in < 500ms on a
  laptop.
- Determinism CI gate: every reference experiment, 3 seeds, replayed → identical state
  hashes.
- Scrubber renders a recorded session at 10 arbitrary seq points, matching live
  snapshots captured during recording.
- A Python bot completes a full session against a dev server using only the public SDK.
