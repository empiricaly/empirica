# Spec — Payment & the credit ledger (resolves A5)

Status: Draft for review. Backs [12](../12-integrations.md); implements F8/F19.

## 1. Model: journaled credits, reviewed submission

Money is **a ledger, not a computation at the end**:

```
credits(id, player_id, amount_minor, currency, reason, event_seq,
        state: accrued | approved | submitted | settled | voided,
        batch_id?, external_ref?)
```

- `ctx.pay.credit(player, amount, reason)` — callable from hooks, exits, task
  results, admin commands. Written in the causing transaction (`event_seq` FK), so
  every cent has provenance ("bonus: round 7 onEnd, seq 10412").
- Amounts are **integer minor units** with a single deployment currency
  (`payment.currency`, default USD; `usd(2.50)` → `{250, USD}`). No floats, no
  mixed currencies in v1.
- `ctx.pay.void(creditId, reason)` (server/admin) — corrections are new rows, never
  edits; the ledger is append-only like everything else.
- Idempotency: credits issued inside hooks inherit exactly-once from the engine; a
  `reason` + node-run uniqueness guard (`oncePerRun: true` default for hook-issued
  credits) protects against accidental double-issue in user code loops.

## 2. Accrual → payout pipeline

1. **Accrued** — issued during the session; the participant-facing ledger line
   (failure-UX spec §2) always shows the accrued total: what we currently owe.
2. **Approved** — operator (or auto-approval rule: `payment.autoApprove: true` for
   trusted flows) marks players/batches approved in the admin review surface:
   a table of player × credits × exit path × flags (attention-check fails,
   crash-loops, suspicious durations from session-health).
3. **Submitted** — a payout **batch** goes to the provider adapter (Prolific bulk
   bonus, etc.) as an effect with an idempotency key = batch id; per-player results
   recorded (`external_ref`).
4. **Settled / failed** — reconciliation webhook or poll updates state; mismatches
   (paid-but-no-data, data-but-unpaid) surface in admin ([12](../12-integrations.md)).

Base pay note: platforms like Prolific pay the base outside our system; the ledger
models it anyway (reason `base`, state `settled-external` at exit) so the
participant-facing total and the researcher's budget view are truthful. Config:
`payment.baseHandledByPlatform: true` marks such credits non-submittable.

## 3. Fairness rules (defaults, overridable per deployment)

- Every declared exit path MUST either issue credits in `onExit` or be explicitly
  marked `pay: 'none'` — a boot warning otherwise. No silent zero-pay paths.
- Aborts and pauses: time-based fairness helper `ctx.pay.forTime(player, rate)`
  (elapsed active time × rate) for `gameAborted`-class paths.
- Pause interaction (flow spec open question #4): pauses extend gate deadlines and
  do not reduce time-based credits — **decided here**: pause time counts as active
  time for `forTime` (participants shouldn't pay for researcher pauses).
- Withdrawal: credits already accrued survive redaction (payment obligations are
  not personal data content; the *reason strings* must therefore never contain
  content — lint: reasons are identifiers, not free text).

## 4. Budget view

Admin shows: accrued/approved/submitted totals, projection = (remaining allocation
slots × expected per-player cost from the flow's declared credits), and a hard
`payment.budgetCap` that blocks intake (not mid-session credits) when projected
spend exceeds it. Runaway-bonus bugs get caught by the cap + the per-credit
`payment.maxPerPlayer` sanity limit (boot-required if any dynamic bonus exists).

## 5. Conformance hooks

- Ledger invariants: no negative accrued totals; voids reference existing credits;
  every credit's `event_seq` exists; sum(ledger) reproducible from journal replay.
- Reference experiments: every exit path issues the declared pay in simulation
  (V1/V3 assertions already state this); double-issue guard property test.
- Payout batch idempotency: re-submitting a batch after a crash produces zero new
  provider calls (recorded-fixture Prolific adapter).
- Cap drill: budget cap closes intake, never voids accrued credits.

## Open sub-questions

1. Multi-currency deployments (one study, two participant pools) — defer; would
   need per-pool currency + FX-free separation. → post-v1.
2. Points→money exchange-rate display duties (some IRBs require showing the rate
   during the study) — proposal: `payment.showRate: true` renders it in the stock
   header; decide with A10 copy work.
