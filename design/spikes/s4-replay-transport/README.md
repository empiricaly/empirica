# S4 — Replay Transport & Admin Scrubber

**Question.** Can an admin scrubber ("pick session, pick player, drag a slider over seq")
drive the *actual* client UI through the same Transport abstraction the live client uses,
with exact state equality against what a live client would have seen — including
backward scrubbing and mid-session visibility changes?

**Answer: yes. EXIT CRITERION: PASS** — 20 random seq checkpoints × 2 players × 2 scrub
strategies, cold-connect *and* persistent scrub-walk (forward + backward), all equal to
recorded live state byte-for-byte. 189 assertions, 0 failures.

Run it:

```sh
bun src/main.ts   # generates session-small.db (204 rows) + session-10k.db, runs everything
```

## What was built

| File | Role |
|---|---|
| `src/generate.ts` | Toy 2-player guessing game (5 rounds) journaled as 204 per-field `changes` rows in bun:sqlite + a `visibility` table. Exercises overwrites (timer, guess, score), list appends (`chat.<n>`, private `log.<n>` as indexed subkeys), deletions (`typing.<pid>`), an admin-only field (`round.secret`), and a **dynamic** rule (guess = owner-only until `round.revealed`). |
| `src/projector.ts` | Raw journal → per-viewer **view stream** (`Patch[]`). Reference impl (full re-project + diff per seq, O(N·S)) and incremental impl (O(1)/row + dependency scan on `revealed`); verified identical. |
| `src/transport.ts` | `LiveTransport` (streams the view stream in seq order, `tickMs` = acceleration knob) and `ReplayTransport(targetSeq)` (synthetic catch-up patch, then `stepTo(M)` both directions) with both scrub strategies. |
| `src/store.ts` | `MirrorStore` + `runClient` — the one client code path that applies patches from either transport. |
| `src/render.ts` | `render(store, viewer) → string` terminal UI; frames printed at scrubbed positions. |
| `src/main.ts` | Orchestration, assertions, benchmarks. |

```
interface Transport { connect(): AsyncIterable<Patch>; close(): void }
Patch = { seq, changes: ViewChange[] }          // same shape live / catch-up / scrub
ViewChange = { entity_type, entity_id, key, old?, value? }   // value undefined = leaves view
```

## Does the one-transport abstraction hold?

**Yes, with one deliberate accommodation and one architectural precondition.**

- **No replay leak into client code.** `MirrorStore.apply` and `runClient` are shared
  verbatim; the catch-up patch is just a large ordinary patch; a scrub step is just a
  patch. `render()` reads only the store. The scrubber holds the concrete
  `ReplayTransport` to call `stepTo()` — that lives *outside* the client core (it's the
  admin chrome around it), which is exactly where it should live.
- **Accommodation:** the store must not assume `patch.seq` is monotonically increasing
  (backward scrub emits a lower seq). Live streams happen to be monotonic; nothing else
  in the client knows the difference. Any client logic keyed on "seq only grows"
  (e.g. side-effect triggers such as sounds/animations on transitions) must be derived
  from *state deltas*, not from seq arithmetic.
- **Precondition (the real finding):** the abstraction only holds because **both
  transports speak view space**. Patches are produced by one shared projector
  (raw journal × visibility → per-viewer stream) whose `old` values are the viewer's
  previous *view* values, not the raw `old_json`. Replaying raw rows filtered by a
  static visibility check would (a) leak fields edited-while-invisible on backward
  scrub — raw `old_json` is a value the client never saw — and (b) miss the synthetic
  "here is the current value" emission when a field *becomes* visible.

## Backward-scrub recommendation

Both approaches were implemented and are byte-identical in output (cross-checked at every
checkpoint and on the 10k session):

1. **snapshot-forward** — periodic view-state snapshots (every K patches); state-at-M =
   clone nearest snapshot ≤ M + forward patches; emit `diff(cur, target)`.
2. **inverse-backward** — keep current state; backward = net-apply inverses
   (`value ← old`, `old === undefined` ⇒ delete) of patches in `(M, cur]` newest-first;
   forward = net-apply patches in `(cur, M]`. Cost ∝ |Δseq|, zero extra memory.

Measured (Bun 1.3.11, this container; avg / p95 per operation, p1 view):

| Operation | 204-row session | 10,057-row session |
|---|---|---|
| Cold connect, forward-from-zero | 55 µs / 96 µs | 2.7 ms / 5.5 ms |
| Cold connect, snapshot-forward K=100 | 42 µs / 70 µs | 1.9 ms / 4.0 ms |
| Scrub step, forward-from-zero | 98 µs / 211 µs | 3.7 ms / 9.8 ms |
| Scrub step, snapshot-forward K=100 | 92 µs / 207 µs | 2.1 ms / 7.4 ms |
| Scrub step, **inverse-backward** | 80 µs / 275 µs | 1.8 ms / 9.9 ms |
| Slider-drag step (|Δseq| ≤ 20), snapshot-forward | 69 µs | 957 µs |
| Slider-drag step (|Δseq| ≤ 20), **inverse-backward** | 33 µs | **58 µs** |
| Snapshot build, one-time (K=100) | 41 µs, 67 entries | 25 ms, **249k retained entries** |

(10k figures are measured, not extrapolated; generation of 10,057 rows took ~58 ms and
projecting the 8,953-patch p1 view ~25 ms. Everything scales ≈ linearly in rows, so a
100k session ⇒ ~×10: worst-case jump ~100 ms unless snapshot K is tuned.)

**Recommendation: hybrid, defaulting to inverse-backward.**
- Slider *dragging* is overwhelmingly small-|Δ| — inverse-backward is O(|Δ|), ~16× cheaper
  per drag step at 10k rows (58 µs vs 957 µs) and needs no snapshot memory. Snapshot
  memory is the hidden cost of approach 1: state carries the full chat/log lists, so
  K=100 retained 249k entries at 10k rows (snapshots are near-full copies once lists
  dominate — structural sharing or list-tail elision would be needed to keep it).
- Long random *jumps* degrade for pure inverse-backward (p95 ≈ 10 ms at 10k, ∝ session
  length). Keep **sparse** keyframes (e.g. every 1–5k seqs, or at round boundaries) and
  route a step through whichever start point (current state or nearest keyframe) is
  fewer patches away from the target. Both mechanisms are already the same code here;
  the router is a 5-line min().
- Correctness requirement for inverse-backward: journal rows (and projected view
  changes) must carry trustworthy `old` values, and patch inversion must treat
  `old = undefined` as "delete key" (that is what re-hides a revealed guess and
  un-appends list items when scrubbing backward).

## Design constraints the engine must honor

1. **Per-view projection is a first-class server operation.** One projector must feed
   live sockets *and* the replay/scrubber path. If live filtering and replay filtering
   are two implementations, they will disagree and the scrubber lies about what the
   player saw. (Corollary: persisting the *projected* per-view stream — or being able to
   re-derive it deterministically from `changes` + visibility rules — is what makes
   "what did p2 actually see at seq N" answerable at all.)
2. **Visibility changes mid-session must emit synthetic view-changes.** When
   `round.revealed` flips, the opponent's `guess` enters the view as a patch change
   `old: undefined → value` at that seq (verified: hidden at seq-1, visible at seq,
   re-hidden scrubbing back). This means the engine needs a **visibility dependency
   index**: "`round.revealed` affects `playerRound.guess` of that round" had to be
   hardwired in the incremental projector; a real rule system must declare such deps or
   fall back to O(state) re-projection on rule-input changes. Fields *losing* visibility
   work symmetrically (emit a delete into the view) — same mechanism as the `typing.*`
   deletion rows.
3. **List semantics: appends as keyed inserts, and no eviction without history.** Lists
   journaled as indexed subkeys (`chat.3`) invert cleanly (insert⁻¹ = delete). If the
   engine ever compacts/evicts list items or collapses overwrites in the `changes` log,
   backward reconstruction breaks — eviction must either be journaled as ordinary
   deletes (then scrub shows the evicted state faithfully) or be forbidden for journaled
   fields.
4. **`old_json` must be authoritative** (written transactionally with the new value).
   Both the inverse strategy and the projector's diff correctness rest on it. A
   corrupted `old` chain is detectable (replay(0→N) ≠ inverse-consistency) — worth a
   validator in the real engine.
5. **Non-monotonic seq at the store boundary** (see above) — keep client side-effects
   off seq arithmetic.
6. **Default-deny visibility.** The projector resolves rules first-match with a deny
   fallback; `round.secret` (admin-only) and foreign `log.*` provably never appear in
   any player stream (asserted per change, per patch, across all runs).

## Artifacts

- `session-small.db` / `session-10k.db` — regenerated on each run (gitignored).
- Console output includes rendered scrub frames for both viewers at the same seq
  (asymmetric views) and the reveal boundary hide → show → re-hide sequence.
