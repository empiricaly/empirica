# Package spec — @empirica/client-core

Status: Ready for review. Framework-agnostic client: the transport seam, the
per-field mirror store, the command pipeline, and the typed handle mirror. React
is a thin layer above this; Python speaks the protocol directly (07).

## 1. Public surface

```ts
connect(cfg: {url, token, ns?}): Client
interface Client {
  player: PlayerView; group(kind): GroupView | undefined; groups(kind): GroupView[];
  node: NodeView;                        // current run, stage info, timer
  globals: GlobalsView;
  set(fieldRef, value): Promise<{seq}>;  // optimistic; rejects with typed error (D22)
  command(name, payload?): Promise<{seq}>;
  submit()/retract(): Promise<{seq}>;    // built-ins ← naming spec
  connection: ConnectionView;            // status, serverNow(), offsetConfidence
  subscribe(fieldRef, cb): Unsub;        // per-field granularity
  close(): void;
}
interface Transport { connect(auth): AsyncIterable<Frame>; send(frame): void }  // S4 seam
createReplayTransport(journalFeed): Transport
```

Views mirror the server handle API read-only, filtered by visibility (schema §8):
one mental model both sides.

## 2. Behavioral requirements

BR1 **Transport seam**: client logic cannot distinguish live/replay/sim transports
(S4-proven; the abstraction is load-bearing for the scrubber) ← 08/09. BR2 mirror
store applies each patch batch in ONE synchronous pass, preserving identity of
unchanged values; per-field subscriber notification only (S6 constraints: cached
snapshots, stable subscribe identity) ← 08. BR3 optimistic `set` re-renders locally
< one frame, reconciles on ack/patch, rolls back on rejection with the typed error
surfaced ← 06/08. BR4 command ids client-generated; safe resend after reconnect
(server LRU) ← wire §5. BR5 offline queue: latest-value per self-writable field,
flush on resume; commands fail fast ← D23. BR6 cursor + resumeKey persisted;
gap → reconnect-with-cursor; restore-epoch honored ← wire §4. BR7 `serverNow()`
EWMA offset; all timer displays derive from it ← wire §6. BR8 list views: chat-scale
copy-on-append with the documented ceiling; version-numbered snapshots ← S6 §5.
BR9 collab fields: Yjs doc binding, updates relayed opaque, awareness on the
ephemeral channel, never journaled client-side ← 08/D25. BR10 typed by the
experiment schema (codegen or inference — implementer's choice; the *types* are
the requirement).

## 3. Suites owned

render (store half) · resume (client half) · protocol goldens (client side) ·
latency/rollback drills ← conformance index.

## 4. Non-goals

No React/DOM. No UI copy (react + i18n catalog). No auth flows beyond token
plumbing (server owns issuance).

## 5. Notes

S4's `store.ts`/`transport.ts` and S6's `field-store.ts` are the reference
implementations — both spike-verified against the exact constraints in BR1–BR2.
