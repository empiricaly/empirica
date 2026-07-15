# 11 — Packaging & deployment

Status: Draft

Three layers: **create → build → deploy**. Neither clone-repo (v1's un-upgradeable
Meteor mistake) nor bare library (no deployable artifact).

## Create

`bun create empirica` scaffolds a thin, conventional project:

```
my-exp/
  experiment.ts        # schema + flow + hooks + commands + bots + payment
  client/              # Vite + React app
  empirica.config.ts   # deployment config schema (secrets, intake defaults)
  test/                # simulation tests (scaffolded with real assertions)
```

Framework code lives in versioned packages. **Sugar lives visibly in the project**
(shadcn philosophy): the classic template's helpers (`useGame` etc., ~50 lines) are code
the author owns — greppable end-to-end, which is strictly better for LLM authorship than
hidden framework magic.

`empirica dev` runs engine + client dev server + admin in one process. This retires, in
one stroke: the Go binary, the version-proxy binary, Volta bootstrapping, go-bindata,
and stdout-string-matching process supervision.

## Build: the sealed bundle

`empirica build` produces a **sealed, self-contained artifact**:

- With Bun's single-file compile: one executable embedding server code, compiled client
  assets, admin UI, and static files.
- Plus a **manifest**: experiment name/version, **content hash**, engine version,
  required env/secrets (validated at boot), resource hints.
- The content hash is stamped into every journal event ([05](05-storage.md)) — the exact
  code that produced the data is identified forever. Provenance and preregistration
  (hash your bundle, register it) as a side effect of packaging.

The bundle is **the deployment contract**: hosts never run installs or builds; they
receive a sealed binary, attach a volume, configure backup, run. This is also precisely
what a future Empirica-managed platform would ingest — designing the format now makes
that platform cheap later.

## Deploy

Baseline forever: it's a binary and a SQLite file — run it on any box.

`empirica deploy` with **adapters**:

- **`fly` (blessed default)** — fully scriptable provisioning: app + volume + Tigris
  bucket + secrets + Litestream config in one command; region placed near the
  participant pool; machines stop/start cleanly.
- `railway`, `render` — secondary managed adapters.
- `ssh` — any VPS via Docker (the Hetzner crowd).
- `docker` — emit Dockerfile/compose for everything else.

### Backup: Litestream

A sidecar that watches the SQLite WAL and continuously streams frames to object storage
(S3 / Tigris / GCS / B2), with generational snapshots and **point-in-time restore**
(`litestream restore -timestamp …`). Near-zero write cost, zero application changes.
It is backup/restore, not live replication — exactly right for a single-writer engine.
Recovery: node dies → new node → restore → players reconnect via cursors
([06](06-sync-and-visibility.md)). Adapters configure it by default; a deployment
without offsite backup warns loudly.

### Ephemeral studies (first-class workflow)

Research is bursty. `empirica deploy --ephemeral` provisions for the study window;
`empirica archive` snapshots the DB to storage, verifies the export, and tears down.
A study day costs pocket change and leaves a sealed, restorable artifact.

## Runtime & stack decisions

- **Bun-first, with a seam.** `bun:sqlite` (synchronous — what the single-writer loop
  wants), single-file compile (the sealed bundle), and `Bun.serve`'s WebSockets — built
  on uSockets/uWebSockets internally, with native pub/sub topics
  (`ws.subscribe` / `server.publish`) that map 1:1 onto audience-class fanout
  ([06](06-sync-and-visibility.md)). This dissolves the "should we adopt
  uWebSockets.js?" question: we get that engine without its packaging awkwardness.
- **The seam**: sqlite driver, HTTP/WS server, and asset embedding sit behind one thin
  internal interface; a Node-compat CI job runs while cheap. Exit exists; we don't
  design for the exit. Drop Bun only on demonstrated, not hypothetical, breakage.
- No ORM in the engine hot path; Zod (via standard-schema) under the field DSL;
  monorepo packages: `engine` (pure, no I/O — what makes simulation honest), `server`,
  `client-core`, `react`, `cli`, `admin`.

## Acceptance criteria

- `bun create empirica && cd my-exp && empirica dev` → playable experiment in < 2 min
  on a clean machine.
- `empirica build` artifact runs a full session on a box with nothing installed.
- Fly adapter: provision → run session → kill machine → restore → players resume; one
  command each step.
- Boot with missing/invalid secrets fails at startup with the manifest-derived message,
  never mid-session.
