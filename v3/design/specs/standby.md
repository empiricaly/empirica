# Spec — Standby lifecycle (resolves A12)

Status: Frozen (2026-07-15). Backs flow spec §2.3/§4 (F7); interacts with A5 (pay),
A6 (hold screen), 06 (visibility).

## 1. Recruitment & dormancy

`groups.fixedSize({ ..., standby: { count, releaseAfter, pay? } })` admits `count`
extra members with role `standby` and **`dormant: true`** on the membership.

**Dormancy is an engine concept** with exactly three effects:
1. Dormant memberships are **excluded from every visibility audience**
   (`members(kind)`, `role(kind, r)`) — a standby's transport never contains game
   content (conformance: wire-level leak test).
2. Dormant members are **exempt from barriers** and never counted in `min`/size
   checks for stage advancement.
3. Dormant members render the stock hold screen (failure-UX §3) with the truthful
   pay note.

Everything else about them is a normal membership (journaled, exportable — analysts
can see who stood by).

## 2. Promotion

Trigger: dropout policy `then: 'replace'` (flow spec §2.4), or admin intervention.

- Order: FIFO by `joined_seq` among dormant members; matcher-level override hook
  `onPromote(candidates, ctx) => membership` for stratified needs (e.g. must be a
  buyer).
- Effect (one transaction): dropped member → role `dropped` + routed per
  `droppedPath`; standby membership → target role, `dormant` cleared; view backfill
  delivers the game state in the same patch (06's atomic membership-change rule);
  the promoted player lands on the group's current node (stock catch-up interstitial,
  configurable `onPromoteStep`).
- State: the dropped player's player×run state stays theirs (science record). The
  promoted player starts fresh; experiments MAY copy role-critical fields in an
  `onPromote` hook (documented pattern, not automatic — silent state inheritance
  would fabricate data).
- Timers unaffected; barriers recount immediately (promoted member is now required).

## 3. Release

`releaseAfter: duration | 'stage:<name>' | 'phase:<n>'` — whichever comes first ends
the standby's usefulness window:

- Un-promoted standbys exit via the `standbyReleased` path (declared like any exit;
  A5's no-silent-zero-pay rule applies — the `pay` shorthand issues the credit).
- After release, `replace` has no candidates → the dropout `fallback` tier governs
  (continue/abort) — no special case.
- Admin may release early or extend (journaled interventions).

## 4. Conformance hooks

- Dormancy leak test in V1's suite (standby transport ⊅ any `members('game')` field).
- Promotion drill (V1: disconnect at round 3 → FIFO standby promoted, barrier
  recount, catch-up step shown).
- Release drill: no dropout → standby released at `releaseAfter` with credit;
  post-release dropout → fallback tier engages.
- Export: dormant intervals visible (joined/promoted/released seqs).
