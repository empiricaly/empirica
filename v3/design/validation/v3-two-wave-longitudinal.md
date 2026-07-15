# V3 — Two-wave longitudinal survey with treatments (paper validation)

Status: **Conformed to frozen specs (2026-07-15)** — contract canary (see V1 note).
Originally drafted against docs 02–08 + V1/V2 deltas. Findings at bottom.

Stresses: **solo studies with zero group machinery**, enrollment-time treatment,
**per-player scheduled gates** (day-7 wave), magic-link re-entry, reminders,
attrition/deadline handling, **per-wave payment**.

## Design (the science)

Wave 1: baseline survey + a framing manipulation (`framing ∈ {gain, loss}` assigned at
enrollment; the framing text appears inside wave-1 and wave-2 materials). Wave 2 opens
7 days after each player's wave-1 completion, closes 3 days later. Reminder at day 6.
Pay per completed wave; wave-2 no-shows are finalized automatically with wave-1 pay.

## experiment.ts

```ts
import {
  defineExperiment, defineSchema, field, record,
  flow, step, gate, route, ok, retry, balanced, usd, days, z,
} from '@empirica/engine';

const schema = defineSchema({
  player: {
    wave1DoneAt: field(z.number()).visible('self'),      // set by hook; server-written
  },
  // no `groups:` section at all — solo study, zero group tax (F22)
  nodes: {
    wave1: { player: { answers: record(z.unknown()).visible('self').writable('self') } },
    wave2: { player: { answers: record(z.unknown()).visible('self').writable('self') } },
  },
});

const experimentFlow = flow.seq(
  step('consent'),

  step('wave1', {
    validate: (ctx, { player, run }) => {
      if (!complete(run.player(player).get('answers'))) return retry();
      player.set('wave1DoneAt', ctx.now);
      ctx.pay.credit(player, usd(1.50), 'wave1');          // pay per wave — F19
      return ok();
    },
  }),

  gate('waitWave2', {                                      // per-player gate — F18
    until: (ctx, { player }) => ctx.now >= player.get('wave1DoneAt') + days(7),
    reminders: [{
      at: (ctx, { player }) => player.get('wave1DoneAt') + days(6),
      effect: 'invite.reminder',                            // email / Prolific message
    }],
    deadline: {
      at: (ctx, { player }) => player.get('wave1DoneAt') + days(10),
      then: route('wave2NoShow'),                           // attrition finalized — F23
    },
    reentry: 'magicLink',                                   // signed re-entry link — F20
  }),

  step('wave2', {
    validate: (ctx, { player, run }) => {
      if (!complete(run.player(player).get('answers'))) return retry();
      ctx.pay.credit(player, usd(2.50), 'wave2');
      return ok();
    },
  }),
);

export default defineExperiment({
  schema,
  factors: { framing: ['gain', 'loss'] },
  assign: { treatment: balanced(), at: 'enrollment' },      // player-level treatment
  flow: experimentFlow,

  exits: {
    finished:   { code: 'LNG-FIN' },                        // credits already issued
    wave2NoShow:{ code: 'LNG-W1'  },                        // wave-1 pay stands
    withdrawn:  { code: 'LNG-WDR', onExit: (ctx, p) => ctx.redact(p) },  // — F24
  },

  bots: {
    default: (b) => b
      .onStep('consent', () => b.complete())
      .onStep('wave1',   () => b.complete({ answers: fakeAnswers(b.rng) }))
      .onStep('wave2',   () => b.complete({ answers: fakeAnswers(b.rng) })),
    dropout: (b) => b                                       // attrition bot for sim
      .onStep('consent', () => b.complete())
      .onStep('wave1',   () => b.complete({ answers: fakeAnswers(b.rng) })),
      // never returns for wave 2
  },
});
```

## Client sketch

```tsx
function Wave1() {
  const player = usePlayer();
  const framing = player.treatment.framing;                 // player-level treatment
  return <Survey items={wave1Items(framing)} onDone={submitStep} />;
}
// The gate needs no custom UI: the stock Gate component renders
// "wave 2 opens on {date}" from the gate's schedule metadata.
```

## Simulation assertions

```ts
const sim = simulate(experiment, {
  players: 100, seed: 3,
  botMix: { default: 0.8, dropout: 0.2 },
});
await sim.run();                                            // virtual clock spans 10 days
expect(sim.exited('finished')).toHaveLength(80);
expect(sim.exited('wave2NoShow')).toHaveLength(20);
// balanced() held under attrition: framing arms differ by ≤ 1 among *enrolled*
// reminders fired exactly once per pending player at day 6 (effect journal)
// ledger: finished = $4.00, no-show = $1.50, nobody unpaid or double-paid
```

## Findings → design deltas

- **F18 — Gates are per-unit, not global.** `until`/`deadline`/`reminders` take
  `(ctx, {player})` and each waiting player gets engine timers (armed from the timers
  table, restart-safe). Doc 03 described gates as pool-level; the spec must state:
  a gate holds *units* (players or groups), each with its own schedule, predicates
  re-evaluated on state change or timer. → 03/A1.
- **F19 — Credit ledger confirmed** (with V1's F8): pay accrues at completion moments,
  not at a terminal function; exit paths become pure completion-code mappings when
  credits were already issued. → resolves A5's shape.
- **F20 — Re-entry auth is a gate concern**: `reentry: 'magicLink'` makes the gate emit
  (via the reminder/invite effects) signed single-use links that re-attach the session
  to the player identity on any device. Token lifecycle spec lands in A4; the *hook
  point* is the gate. → A4, 12.
- **F21 — `ctx.now` + `days()` arithmetic over journaled timestamps** is sufficient for
  longitudinal scheduling; no cron concept needed in experiments. Wall-clock ↔ virtual
  clock equivalence in simulation is what makes the 10-day sim run in milliseconds.
- **F22 — Solo studies really are zero-tax**: no groups section, no match node, no
  lobby; the admin pipeline view degenerates gracefully to a step funnel. Validates
  the v2 "playerCount: 1 game" tax removal.
- **F23 — Attrition is an exit path, not a special state**: deadline route finalizes
  the player; analysis sees a clean `wave2NoShow` cohort. No zombie sessions.
- **F24 — Withdrawal exit path calls `ctx.redact(player)`** — ties the GDPR/IRB
  redaction command (05) into the flow as an ordinary declared path. Consent docs can
  promise a URL that triggers it. → 05/A7.

**Verdict: expressible**, and pleasantly small — the solo case reads like a form
library, which is exactly the "no group tax" goal. The per-player gate generalization
(F18) is the one real engine-spec change; it also cleanly subsumes multi-day *group*
designs (a group waiting at a gate is one unit with one schedule).
