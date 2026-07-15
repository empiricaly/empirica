# V1 — Public goods with punishment & chat (paper validation)

Status: Drafted against docs 02–08 as written. **Findings at the bottom are design
deltas** — places the docs creaked when forced to full fidelity.

Stresses: stages/barriers, treatment-conditional structure, in-group chat, standby
over-recruitment, dropout policy, reveal timing, quiz screening, payment, exit paths.

## Design (the science)

4 players, endowment 20 points/round, 10 rounds. Each round: contribute (private) →
[punish, if treatment] → results. Public pot multiplied by MPCR and shared. Punishment:
assigning deduction points costs the punisher 1/point, costs the target 3/point.
Factors: `mpcr ∈ {0.4, 0.75}`, `punishment ∈ {on, off}`. Group chat throughout rounds.
Over-recruit 1 standby per game. Quiz screens out after 2 failed attempts.

## experiment.ts

```ts
import {
  defineExperiment, defineSchema, field, list, record,
  flow, step, gate, match, phase, stage, repeat,
  groups, balanced, route, abort, ok, retry, usd, z,
} from '@empirica/engine';

const ENDOWMENT = 20;
const ROUNDS = 10;
const POINT_RATE = 0.01; // usd per point

// ---------------------------------------------------------------- schema

const schema = defineSchema({
  player: {
    points:       field(z.number().int().min(0)).default(0).visible('self'),
    quizAttempts: field(z.number().int()).default(0),          // server-only
  },

  groups: {
    game: {
      fields: {
        chat: list(z.object({ text: z.string().min(1).max(1024) }))
                .visible('members').append('members'),
        // list appends are auto-attributed by the engine: (actor, ts, seq) — F9
      },
    },
  },

  // Run-scoped state, keyed by flow-node name (validated against the flow at boot — F2)
  nodes: {
    round: {
      fields: {
        contributions: record(z.number().int()).visible('members'), // revealed copy — F1
        potTotal:      field(z.number()).visible('members'),
      },
      player: {
        contribution: field(z.number().int().min(0).max(ENDOWMENT))
                        .visible('self').writable('self'),          // hidden until reveal
        payoffBase:   field(z.number()).visible('self'),
        penalty:      field(z.number().int()).default(0).visible('self'),
        punishCost:   field(z.number().int()).default(0).visible('self'),
      },
    },
    punish: {
      player: {
        assigned: record(z.number().int().min(0).max(10))
                    .visible('self').writable('self')
                    .refine(r => Object.values(r).reduce((a, b) => a + b, 0) <= 10,
                            'punishment budget is 10 points'),
      },
    },
    quiz: {
      player: { answers: record(z.string()).visible('self').writable('self') },
    },
    exitSurvey: {
      player: { responses: record(z.unknown()).visible('self').writable('self') },
    },
  },
});

// ---------------------------------------------------------------- flow

const experimentFlow = flow.seq(
  step('consent'),
  step('instructions'),

  step('quiz', {
    validate: (ctx, { player, run }) => {                      // step validation — F10
      if (grade(run.player(player).get('answers'))) return ok();
      const attempts = player.get('quizAttempts') + 1;
      player.set('quizAttempts', attempts);
      return attempts >= 2 ? route('screenedQuiz') : retry({ showHints: true });
    },
  }),

  gate('intakeOpen'),                                           // default: intake switch

  match('lobby', groups.fixedSize({
    kind: 'game',
    size: 4,
    standby: { count: 1, releaseAfter: '12m' },                 // F7: release policy
    fill: 'eager',
    treatment: balanced(),                                      // block-randomized arms
    timeout: '5m',
    onTimeout: route('lobbyTimeout'),
  })),

  repeat(ROUNDS, phase('round', {
    onDisconnect: {                                             // two-tier policy — F6
      grace: '45s',
      then: 'replace',                                          // pull from standby
      fallback: { then: 'continue', min: 3, belowMin: abort('gameAborted') },
    },

    stages: (ctx, { group }) => [                               // conditional list — F4
      stage('contribute', {
        duration: '30s',
        onEnd: (ctx, { run, group }) => {
          const members = group.members();
          // schema default(0)? No — contribution has no default: unset means
          // "did not act"; treat as 0 explicitly for the science — F5
          const c = (m) => run.player(m).get('contribution') ?? 0;
          const total = members.reduce((s, m) => s + c(m), 0);
          const share = (total * group.treatment.mpcr * members.length) / members.length;
          run.set('contributions',
            Object.fromEntries(members.map(m => [m.id, c(m)])));  // reveal-by-copy — F1
          run.set('potTotal', total);
          for (const m of members)
            run.player(m).set('payoffBase', ENDOWMENT - c(m) + share);
        },
      }),

      ...(group.treatment.punishment ? [
        stage('punish', {
          duration: '30s',
          onEnd: (ctx, { run, group }) => {
            for (const m of group.members()) {
              const assigned = run.node('punish').player(m).get('assigned') ?? {};
              const spent = Object.values(assigned).reduce((a, b) => a + b, 0);
              run.player(m).set('punishCost', spent);
              for (const [targetId, pts] of Object.entries(assigned)) {
                const t = group.member(targetId);
                run.player(t).set('penalty', run.player(t).get('penalty') + 3 * pts);
              }
            }
          },
        }),
      ] : []),

      stage('results', {
        duration: '15s',
        onEnter: (ctx, { run, group }) => {
          for (const m of group.members()) {
            const earned = Math.max(0,
              run.player(m).get('payoffBase')
              - run.player(m).get('penalty')
              - run.player(m).get('punishCost'));
            m.player.set('points', m.player.get('points') + Math.round(earned));
          }
        },
      }),
    ],
  })),

  step('exitSurvey'),
);

// ---------------------------------------------------------------- experiment

export default defineExperiment({
  schema,
  factors: { mpcr: [0.4, 0.75], punishment: [true, false] },
  flow: experimentFlow,

  exits: {                                                      // paths → codes + pay — F8
    finished:     { code: 'PGG-FIN',  onExit: (ctx, p) => {
                      ctx.pay.credit(p, usd(2.50), 'base');
                      ctx.pay.credit(p, usd(p.get('points') * POINT_RATE), 'bonus'); } },
    screenedQuiz: { code: 'PGG-SCRN', onExit: (ctx, p) => ctx.pay.credit(p, usd(0.50), 'screened') },
    lobbyTimeout: { code: 'PGG-LOBBY', onExit: (ctx, p) => ctx.pay.credit(p, usd(1.00), 'timeout') },
    gameAborted:  { code: 'PGG-ABRT', onExit: (ctx, p) => {
                      ctx.pay.credit(p, usd(2.50), 'base');
                      ctx.pay.credit(p, usd(p.get('points') * POINT_RATE), 'partial'); } },
    standbyReleased: { code: 'PGG-STBY', onExit: (ctx, p) => ctx.pay.credit(p, usd(2.00), 'standby') },
  },

  bots: {
    default: (b) => b
      .onStep('consent',      () => b.complete())
      .onStep('instructions', () => b.complete())
      .onStep('quiz',         () => b.complete({ answers: QUIZ_CORRECT }))
      .onStage('contribute',  () => b.set('contribution', b.rng.int(0, ENDOWMENT)))
      .onStage('punish',      () => b.set('assigned', {}))
      .onStep('exitSurvey',   () => b.complete({ responses: {} })),
  },
});
```

## Client sketch (hook-surface check)

```tsx
function Round() {
  const node = useNode();                       // { name:'round', stage, run, timer }
  switch (node.stage.name) {
    case 'contribute': return <Contribute />;
    case 'punish':     return <Punish />;
    case 'results':    return <Results />;
  }
}

function Contribute() {
  const player = usePlayer();
  const node = useNode();
  const mine = node.run.mine;                   // player × run accessor
  return <>
    <Slider value={mine.get('contribution') ?? 0}
            onChange={v => mine.set('contribution', v)} max={20} />
    <SubmitButton />                            {/* stage submit = built-in command */}
    <Chat group={useGroup('game')} field="chat" />
  </>;
}

function Results() {
  const node = useNode();
  const peers = usePeers('game');
  return <table>{peers.map(p => (
    <Row key={p.id} name={p.get('name')}
         contribution={node.run.get('contributions')[p.id]} />))}
  </table>;
}
```

## Simulation test sketch

```ts
const sim = simulate(experiment, { players: 5, seed: 7 });  // 4 + 1 standby
await sim.run();
expect(sim.groups('game')).toHaveLength(1);
expect(sim.runs('round')).toHaveLength(10);
// privacy: during contribute, no other player's transport contains my contribution
sim.assertNeverLeaked({ node: 'round', playerField: 'contribution',
                        beyond: 'self', until: stageEnd('contribute') });
// dropout drill
const sim2 = simulate(experiment, { players: 5, seed: 8 });
sim2.at(round(3), () => sim2.disconnect(sim2.players[0]));
await sim2.run();
expect(sim2.player(4).role('game')).toBe('member');          // standby promoted
```

## Findings → design deltas

- **F1 — Reveal timing.** Static visibility can't express "private during decision,
  public at results". The **reveal-by-copy** pattern (self-visible field → hook copies
  into members-visible run field) is explicit, journal-clean, and sufficient. Adopt as
  the documented idiom; a `reveal()` sugar can come later. **No new visibility
  primitive** (upholds D15).
- **F2 — Run-state declaration.** Schema gains a `nodes:` section keyed by flow-node
  name (fields + per-player fields per node). Boot-time cross-validation: every node
  referencing state must have a schema entry; unknown node names are boot errors.
  → 02, 03, A2.
- **F3 — Hook placement.** Node lifecycle hooks (`onEnter/onEnd/onTimeout/validate`)
  colocate in the flow node config; only field-change hooks, commands, and exits live
  at experiment level. One place to look per node — better for humans and LLMs. → A1/A2.
- **F4 — Conditional structure.** `stages:` may be a function of `(ctx, {group})`,
  evaluated once at phase-run start, journaled with the run (admin renders the resolved
  list per group). Same mechanism covers treatment-dependent round counts via
  `repeat.while`. → 03.
- **F5 — Unset vs default.** Schema `default()` applies at entity/run creation. A field
  with no default reads `undefined` — "player did not act", which the science often
  needs to distinguish from "acted with value 0". Hooks handle it explicitly. Rule:
  **defaults are for accumulators, absence is data.** → A2.
- **F6 — Dropout policy is two-tier**: primary action (`replace`) plus fallback chain
  (`continue` with `min`, then `abort(path)`). Doc 03's single `then` is insufficient.
  → 03.
- **F7 — Standby needs a release policy**: `releaseAfter` duration (or round marker) +
  its own exit path/pay. New backlog item (A12).
- **F8 — Payment = credit ledger.** `ctx.pay.credit(player, amount, reason)` — journaled
  credits issued from hooks/exits; admin reviews the ledger pre-submission. Kills the
  single-terminal-function model; V3 confirms (per-wave pay). → resolves A5 direction.
- **F9 — List appends are engine-attributed** (actor, ts, seq) — chat needs no sender
  field in user schema. → A2.
- **F10 — Step validation contract**: `validate` returns `ok() | retry(meta) |
  route(exitPath)`. Server-side quiz grading with attempt limits falls out. → A1.

**Verdict: expressible.** No coordination logic outside the algebra; every barrier,
timer, and membership change is engine-owned. The deltas are additive spec detail, not
structural changes.
