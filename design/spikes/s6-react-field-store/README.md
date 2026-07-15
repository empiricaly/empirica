# S6 — React per-field external store (`useSyncExternalStore`)

Spike for the Empirica v3 client redesign. Verifies the claim: **N unrelated
field changes cause exactly N subscriber re-renders, at tiny per-update cost.**

**Verdict: claim verified. All exit criteria PASS.**

## Setup

- Node v22.22.2 (native TypeScript type stripping — `node test/render-counts.test.ts`, no build step)
- **react 19.2.7 / react-dom 19.2.7** (React 19), jsdom 29.1.1
- `react-dom/client` `createRoot` into jsdom; updates driven inside `act` (imported from `react`), with `globalThis.IS_REACT_ACT_ENVIRONMENT = true`
- Tree: 100 `PlayerCard` (3 `useField` each: name/score/connected) + 1 `ChatPane` (`useList`, renders last 50) + 1 `Timer` + 100 `Unrelated` = **202 components, 402 live subscriptions**
- Run: `npm test` (or `node test/render-counts.test.ts`)

Store: `src/field-store.ts` — `Map<key, value>` + per-key `Set<listener>`;
`set(key, v)` bails on `Object.is` equality, otherwise replaces the value and
notifies only that key's subscribers. List variant is append-only; each append
creates a **new array** (copy) so snapshot identity changes exactly when
content changes. `useField`/`useList` = `useSyncExternalStore` with a
`useCallback`-stabilized subscribe and `getSnapshot = () => map.get(key)`.

## Results (representative of 3 runs; jsdom + React dev build — timings are indicative only, not browser numbers)

| Scenario | Renders (exact) | Timing | PASS |
|---|---|---|---|
| Mount | 202 (each component once) | wall ≈ 40ms | ✅ |
| (a) 200 single score updates, 1 act each | 200 (each card exactly 2, per-act delta always 1, others 0) | mean 0.44ms, p50 0.36ms, p95 0.85ms per update→commit | ✅ |
| (b1) 200 chat appends, one act (burst) | ChatPane **1**, others 0 (React 18+ batching) | 0.9ms wall for whole burst | ✅ |
| (b2) 200 chat appends, 1 act each | ChatPane 200, others 0 | mean 0.35ms, p95 0.51ms | ✅ |
| (c) 100 timer ticks | Timer 100, others 0 | mean 0.49ms, p95 0.65ms | ✅ |
| (d) mixed seeded 1000 updates (incl. 90 to unsubscribed "ghost" keys) | **910 renders for 910 subscribed updates, 0 for ghosts, per-component counts exact** | mean 0.28ms, p95 0.38ms | ✅ |
| (e1) `set()` same primitive | 0 | — | ✅ |
| (e2) `notify()` without value change | 0 (React bails: identical snapshot ref) | — | ✅ |
| (e3) `set()` same **object reference** | 0 | — | ✅ |
| (e4) `set()` deep-equal but **new** object | 1 (identity, not structure!) | — | ✅ |
| (f) interleaved burst then flush | DOM == final store state; 1 render per touched component; full-tree sweep 0/200 mismatches | — | ✅ |

**Exit criteria:**

- Zero extraneous re-renders in (a)–(c): **PASS** (also holds in (d))
- Mean update→commit < 2ms: **PASS** — all 1500 individually-timed updates: **mean 0.33ms, p50 0.30ms, p95 0.41–0.56ms, max ~4ms** (max = occasional GC/JIT hiccup)

Per-update cost includes `act()` overhead; the store-side work is a Map write +
one Set walk, effectively free. Cost is O(subscribers-of-that-key), independent
of the 402 total subscriptions.

## React 18/19 gotchas found (these should shape client-core)

1. **`getSnapshot` MUST return a cached/stable reference for unchanged data.**
   Verified the failure mode live (scenario g): a hook whose getSnapshot returns
   `[...list]` (fresh identity per call) makes React re-render forever; dev
   build logs "The result of getSnapshot should be cached to avoid an infinite
   loop" and then throws **"Maximum update depth exceeded"** (surfaced via
   `createRoot`'s `onUncaughtError`). Our store satisfies this for free because
   snapshots are the stored references themselves — client-core must never
   derive/allocate inside getSnapshot (no `.slice()`, no object literals).
   Selectors need a separate memoization layer (or
   `useSyncExternalStoreWithSelector`).

2. **The `subscribe` argument needs a stable identity too.** An inline
   `(cb) => store.subscribe(key, cb)` closure recreated each render makes React
   unsubscribe/resubscribe on every render (churn, and momentary empty-
   subscriber windows). We stabilize with `useCallback([store, key])`;
   client-core should expose pre-bound per-field subscribe functions or memoize
   internally.

3. **Reference equality is the contract, end to end.** `set()` bails on
   `Object.is`; React independently bails when the snapshot ref is unchanged
   (e2 proves the second line of defense works). Consequence (e4): a
   deep-equal but freshly-allocated object DOES re-render. The server-sync
   layer must preserve object identity for unchanged fields when applying
   patches — i.e., write only changed keys, never rebuild the whole state
   object from a snapshot.

4. **`act`/batching semantics (React 18+ auto-batching).** All store
   notifications inside one act/event tick coalesce into one render per
   affected component (b1: 200 appends → 1 ChatPane render; f: 3 score writes →
   1 render showing only the final value). So per-message re-render cost under
   bursty websocket traffic is bounded by *components touched per flush*, not
   messages — client-core should apply each incoming server batch in one
   synchronous pass and let React batch, rather than notifying per-op with
   microtask gaps.

5. **No tearing observed** with concurrent-mode `createRoot`: after an
   interleaved burst, all 200 leaf DOM nodes matched the final store state.
   `useSyncExternalStore` handles external-store updates synchronously by
   design. Caveat: updates inside `startTransition` that read external stores
   de-opt to sync rendering — don't wrap store-driven updates in transitions
   expecting time-slicing.

## List (append-only) implication — measured

Copy-on-append makes k appends into one list **quadratic**: 5k appends =
~30ms, 10k = ~90ms, 20k = ~1.5s (store-side only, no React). Fine for
chat-sized lists (200-append burst renders in <1ms wall), wrong shape for
high-volume streams (logs, event feeds). Also, ChatPane re-renders on *every*
append even though it renders only the last 50 (whole-array subscription), and
`slice(-50)` allocates per render.

**Client-core API implications:**

- Scalar per-field subscription is the right primitive — ship it as built here
  (plus a memoized selector layer for derived values).
- Lists need one of: (i) chunked/persistent structure with structural sharing
  (amortized O(1) append, stable chunk refs), (ii) index/range subscription
  (`useListSlice(key, -50)`) with a version-counter snapshot so unrelated
  ranges don't re-render, or (iii) mutable ring buffer + monotonic version
  number as the snapshot (cheapest; snapshot is an integer, reference problem
  disappears). Any of these also fixes the quadratic append cost.

## Files

- `src/field-store.ts` — store + `useField`/`useList` hooks
- `test/render-counts.test.ts` — full scenario suite (a)–(g) + timings; exits non-zero on any failure
