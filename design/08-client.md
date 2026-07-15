# 08 — Client: core, React bindings, collab fields

Status: Draft

## Layering

```
@empirica/client-core     — transport seam, mirror store, command queue, offsets
@empirica/react           — thin hooks over the core's per-field subscriptions
(user project)            — templates, sugar, UI — visible code, owned by the author
```

### The transport seam (load-bearing decision)

The client core talks to a `Transport` interface and never knows whether it is live:

```ts
interface Transport {
  connect(auth): Stream<Patch | Ack | Presence>;
  send(command): void;
}
```

- Live = WebSocket transport.
- **Replay = a transport fed from the journal** — the same client bundle renders any
  historical moment ([09-simulation-and-replay.md](09-simulation-and-replay.md)).
- Simulation = an in-process transport (no network) for headless bots and tests.

This one interface is what makes session scrubbing, spectating, and fast tests fall out
for free. It is locked early on purpose.

### Mirror store & optimistic writes

Per-field external stores (`useSyncExternalStore`-compatible): a `set()` applies
optimistically and re-renders subscribers *immediately*, reconciling on ack/patch;
rejections roll back and surface as typed errors. This kills v2's
"slider lags one round-trip" behavior and its silent write-drops. Subscriptions are
per-field — a chat append does not re-render the timer.

## React API — minimal and flow-agnostic

The engine-level surface is deliberately small:

```ts
usePlayer()            // self: fields, flow position, connection
useNode()              // current node run: kind, state, timer, stage info
useGroup(kind?)        // my group(s) of a kind: fields, members, roles
usePeers(kind?)        // co-members' visible fields
useGlobals()
useCommand(name)       // typed dispatcher for custom commands
useConnection()        // status, server-time offset
```

**No `useGame`, `useRound`, `useStage`, `onGameStart` in core.** The classic template
*defines* those in a few visible lines inside the scaffolded project (shadcn
philosophy): sugar you own, can read, and can edit — which is strictly better for LLM
authorship, since the entire call chain greps inside the repo. The engine API stays
orthogonal to any particular flow.

Timer display uses the server-clock offset from the transport; countdowns are correct
under client clock skew.

## Ephemeral channels

Schema-declared ephemeral fields (typing, cursors, drag ghosts) get rate-coalescing on
the client (configurable, default ~15 Hz) and bypass persistence server-side. Same
visibility rules as everything else.

## Collab fields (CRDT) — opt-in, never foundational

Server-authoritative command serialization is non-negotiable for experimental state, and
wrong for keystroke-frequency collaboration. Escape hatch:

```ts
essay: field.collab({ schema: 'prosemirror' })   // a Yjs (or Loro) document
```

- Updates are commutative opaque blobs: the server **relays and journals** them without
  interpreting; visibility governs who receives the doc.
- The update log lives in `collab_updates` with periodic compaction snapshots
  ([05-storage.md](05-storage.md)); because updates replay deterministically, **the
  scrubber works on the shared essay** — keystroke-level provenance of a collaborative
  artifact, a dataset in itself for collaboration research.
- Bindings: start with rich text (TipTap/ProseMirror) and a shared whiteboard example.
- Most experiments never touch this; docs present it as advanced.

## Beyond React

The client core is framework-agnostic by construction (plain stores + transport).
React bindings ship first-party; Vue/Svelte/vanilla are thin community layers over the
same core. Non-browser clients (Python bots) speak the protocol directly
([07-api.md](07-api.md)).

## Acceptance criteria

- Input-latency test: local echo of a `set()` under 16ms (one frame) regardless of
  network RTT, with correct rollback on rejection.
- Render-granularity test: N unrelated field changes cause exactly N subscriber
  re-renders (no scope-level fan-out).
- The classic template's sugar layer is ≤ ~50 lines and contains zero engine imports
  beyond the public API.
- Replay transport renders a recorded reference session pixel-identically (modulo
  un-synced local state, documented).
