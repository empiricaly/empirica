# V2 — Bilateral-negotiation market with re-matching (paper validation)

Status: **Conformed to frozen specs (2026-07-15)** — contract canary (see V1 note).
Originally drafted against docs 02–08 + V1 deltas. Findings at bottom.

Stresses: **multi-membership** (market + per-round pair), stable **roles**,
**within-phase re-matching** with constraints, **custom commands** with turn logic,
per-role privacy, sub-group barriers, price-history broadcast.

## Design (the science)

12 traders (6 buyers, 6 sellers), 8 rounds. Each round every buyer is paired with a
seller they haven't traded with (no-repeat), gets a private valuation (buyer: value
drawn U[60,100]; seller: cost U[0,40]), and the pair negotiates by alternating offers
for 90s. Deal surplus is split by the agreed price. Closed-deal prices are public
market history. Factors: `history ∈ {shown, hidden}` (does the market see past prices),
`rounds = 8`.

## experiment.ts

```ts
import {
  defineExperiment, defineSchema, field, list, record,
  flow, step, gate, match, phase, stage, repeat,
  groups, pairs, byRole, noRepeat, balanced, allOf, route, reject, ok, usd, z,
} from '@empirica/engine';

const schema = defineSchema({
  player: {
    profit: field(z.number()).default(0).visible('self'),
  },

  groups: {
    market: {
      roles: { buyer: 6, seller: 6 },                          // stable for the session
      fields: {
        priceHistory: list(z.object({ round: z.number(), price: z.number() }))
                        .visible('members'),                    // server-appended
      },
    },
    pair: {
      roles: ['buyer', 'seller'],
      fields: {
        turn:   field(z.enum(['buyer', 'seller'])).visible('members'),
        offers: list(z.object({ role: z.enum(['buyer', 'seller']),
                                amount: z.number().int() })).visible('members'),
        closed: field(z.boolean()).default(false).visible('members'),
        price:  field(z.number().int()).visible('members'),
      },
    },
  },

  nodes: {
    tradingRound: {
      player: {
        valuation: field(z.number().int()).visible('self'),     // private per round
        gain:      field(z.number()).default(0).visible('self'),
      },
    },
  },
});

const experimentFlow = flow.seq(
  step('consent'), step('instructions'),
  gate('intakeOpen'),

  match('marketLobby', groups.fixedSize({
    kind: 'market',
    size: 12,
    roles: { buyer: 6, seller: 6 },                             // role-balanced formation
    fill: 'cohort',                                             // strongest randomization
    treatment: balanced(),
    timeout: '8m',
    onTimeout: route('lobbyTimeout'),
  })),

  repeat(8, phase('tradingRound', {
    // Pairs live exactly as long as this phase run — formed on enter, dissolved on exit.
    submatch: pairs('pair', {                                   // F11: phase-level submatch
      within: 'market',
      constraint: [byRole('buyer', 'seller'), noRepeat()],      // F13
      roles: 'inherit',                                         // pair role = market role
    }),

    onEnter: (ctx, { run, group }) => {
      for (const m of group.members()) {
        run.player(m).set('valuation',
          m.role === 'buyer' ? ctx.rng.int(60, 100) : ctx.rng.int(0, 40));
      }
      for (const pair of group.subgroups('pair'))
        pair.set('turn', ctx.rng.pick(['buyer', 'seller']));
    },

    stages: [
      stage('negotiate', {
        duration: '90s',
        advance: allOf('pair', p => p.get('closed')),           // F12: sub-group barrier
        onEnd: (ctx, { run, group }) => {                        // timer path: close the rest
          for (const pair of group.subgroups('pair'))
            if (!pair.get('closed')) pair.set('closed', true);   // no deal
        },
      }),
      stage('roundResults', {
        duration: '12s',
        onEnter: (ctx, { run, group }) => {
          if (group.treatment.history === 'shown') {
            for (const pair of group.subgroups('pair'))
              if (pair.get('price') !== undefined)
                group.list('priceHistory').append(               // server append
                  { round: run.iteration, price: pair.get('price') });
          }
        },
      }),
    ],
  })),

  step('exitSurvey'),
);

export default defineExperiment({
  schema,
  factors: { history: ['shown', 'hidden'] },
  flow: experimentFlow,

  commands: {
    offer: {
      input: z.object({ amount: z.number().int().min(0).max(100) }),
      handler: (ctx, { player, input }) => {
        const pair = player.group('pair');                      // F14: current-group rule
        if (!pair || pair.get('closed')) throw reject('NO_ACTIVE_NEGOTIATION');
        const role = pair.member(player).role;
        if (pair.get('turn') !== role) throw reject('NOT_YOUR_TURN');
        pair.list('offers').append({ role, amount: input.amount });
        pair.set('turn', role === 'buyer' ? 'seller' : 'buyer');
      },
    },
    accept: {
      handler: (ctx, { player }) => {
        const pair = player.group('pair');
        if (!pair || pair.get('closed')) throw reject('NO_ACTIVE_NEGOTIATION');
        const offers = pair.list('offers').items();
        const last = offers.at(-1);
        const role = pair.member(player).role;
        if (!last || last.role === role) throw reject('NOTHING_TO_ACCEPT');
        const price = last.amount;
        pair.set('price', price); pair.set('closed', true);

        const run = ctx.at('tradingRound');                     // schema spec §7.2
        for (const m of pair.members()) {
          const v = run.player(m).get('valuation');
          const gain = m.role === 'buyer' ? v - price : price - v;
          run.player(m).set('gain', gain);
          m.player.set('profit', m.player.get('profit') + gain);
        }
        // pair 'closed' feeds the stage barrier — F12; turn logic is plain state — F15
      },
    },
  },

  exits: {
    finished:     { code: 'MKT-FIN', onExit: (ctx, p) => {
                      ctx.pay.credit(p, usd(3.00), 'base');
                      ctx.pay.credit(p, usd(Math.max(0, p.get('profit')) * 0.02), 'bonus'); } },
    lobbyTimeout: { code: 'MKT-LOBBY', onExit: (ctx, p) => ctx.pay.credit(p, usd(1.00), 'timeout') },
  },

  bots: {
    default: (b) => b
      .onStep('consent', () => b.complete()).onStep('instructions', () => b.complete())
      .onStage('negotiate', () => {
        const pair = b.player.group('pair');
        if (!pair || pair.get('closed')) return;
        const role = pair.member(b.player).role;
        if (pair.get('turn') !== role) return;
        const v = b.node.run.mine.get('valuation');
        const last = pair.list('offers').items().at(-1);
        if (last && b.rng.bool(acceptProb(last.amount, v, role))) return b.command('accept');
        return b.command('offer', { amount: counter(v, last, role, b.rng) });
      }),
  },
});
```

## Client sketch

```tsx
function Negotiate() {
  const pair = useGroup('pair');
  const market = useGroup('market');
  const me = useNode().run.mine;
  const myTurn = pair.get('turn') === pair.myRole;
  return <>
    <Valuation value={me.get('valuation')} />
    <OfferHistory offers={pair.list('offers')} />
    {myTurn
      ? <OfferControls onOffer={a => command('offer', { amount: a })}
                       onAccept={() => command('accept')} />
      : <WaitingForCounterpart />}
    {market.treatment.history === 'shown' &&
      <PriceChart data={market.list('priceHistory')} />}
  </>;
}
```

## Simulation assertions

- 8 rounds × 6 pairs; `noRepeat` holds across all rounds (property-checked).
- Privacy: a buyer's `valuation` never appears in any other connection's transport,
  including their pair partner's.
- Turn enforcement: out-of-turn `offer` commands are rejected, journaled as rejections,
  and cause no state change.
- Early-closing pairs idle correctly until the barrier; timer path closes stragglers.
- Determinism: seed 11 twice → identical price history.

## Findings → design deltas

- **F11 — `submatch` is a phase-level declaration**, not a pooled match node: the
  market group stays in the phase; sub-groups are formed at phase-run enter and
  dissolved at exit, lifecycle bound to the run. Pooled `match` nodes and phase
  `submatch` are the two — and only two — group-formation sites. → 03.
- **F12 — Barrier predicates over sub-groups**: `advance: allOf(kind, pred)` joins the
  default all-players-submitted barrier. Predicates re-evaluate on the named kind's
  field changes only. → 03/A1.
- **F13 — Constraint library needs `byRole(a, b)`** alongside `noRepeat()`,
  `roundRobin()`, `randomPerfect()`; constraints compose as a list (all must hold);
  matcher fails loudly at formation if unsatisfiable (odd counts, exhausted no-repeat)
  — surfaced to admin, route policy configurable. → 03.
- **F14 — "Current group" resolution rule**: `player.group(kind)` returns the unique
  *live* group of that kind; the engine enforces ≤ 1 live group per (player, kind) at
  any moment as a core invariant (multi-membership is across kinds, plus historical).
  Makes command code unambiguous. → A1 (invariant), 02.
- **F15 — No turn-taking primitive needed.** Alternation is plain group state validated
  in command handlers. Confirms commands-as-power-tool; keep the engine small.
- **F16 — Server-side list appends** (`group.list(...).append` from hooks/commands) are
  attributed to the causing command's actor; schema `append('members')` governs only
  *client* appends. → A2.
- **F17 — `run.node(name)` / `ctx.run(name, player)` cross-node state access** within a
  phase needs a defined accessor path (V1 used `run.node('punish')`; here
  `ctx.run('tradingRound', player)` from a command handler). Spec the navigation API
  precisely in A2 — this is the one place the paper code felt improvised.

**Verdict: expressible**, including the parts v2 could never do (re-matching,
role-scoped privacy, validated turn logic). F17 is the only API area that needs real
design work rather than spec detail.
