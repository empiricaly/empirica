# 12 — Integrations: recruitment, payment, external systems

Status: Frozen (2026-07-15)

## Prolific (first-class, first)

The highest-pain integration in current practice. Core-adjacent module, not a wiki page:

- **Entry**: study-link parameters (`PROLIFIC_PID`, session/study IDs) captured into
  identities automatically; device/browser screening as stock intro steps.
- **Exit paths → completion codes.** Every declared exit path (finished, screened-out,
  lobby-timeout, group-aborted, kicked) maps to its own completion code with the right
  payment implication. The flow's exit paths *are* the payment taxonomy — no more
  hand-built "return this code if X" pages.
- **Payment hook**: `payment: (ctx, player) => ({ base, bonus })` computed from state,
  journaled; bulk bonus submission via the Prolific API as an effect (idempotency keys
  make retries safe).
- **Reconciliation**: submission webhook ingested → mismatches (paid but no data,
  finished but unpaid) surfaced in the admin.
- Optional: study posting/pausing via API, so `intake open` and "study visible on
  Prolific" are one action.

MTurk and CloudResearch follow the same adapter interface; campus pools via generic
magic-link invitations.

## Invitations & multi-day

Wave/multi-day designs ([03-flow.md](03-flow.md) gates) need re-entry: magic links
(signed, single-use refresh) delivered by email adapter or platform messaging
(Prolific messages API). Reminder scheduling is a stock effect; deliverability is the
researcher's SMTP/API key, not our infrastructure.

## LLM providers

`ctx.llm` used by `task` nodes and LLM bots ([09](09-simulation-and-replay.md)) is an
adapter (Anthropic first, OpenAI-compatible second) with: journaled request/response
(replay + provenance — *what did the model say to the participant* is data), cost
accounting per session surfaced in admin, and recorded-fixture mode for simulation.

## Webhooks & external control

Covered by [07-api.md](07-api.md): scoped service tokens for inbound control (lab
schedulers, posting bots), signed outbound webhooks for reactions. Design intent:
a lab can orchestrate recruitment → intake → export entirely from a notebook.

## Acceptance criteria

- End-to-end Prolific sandbox test: recruit → consent → session → exit paths → codes →
  bonus submission → reconciliation, driven by simulation + recorded API fixtures.
- Every exit path in the reference experiments has a mapped completion code and a
  payment consequence; the admin shows the money column per player before submission.
