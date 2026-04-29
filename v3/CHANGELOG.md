# Changelog

All notable changes to v3 are recorded here. v3 is a clean-slate rewrite,
not a continuation of v2 versioning.

## Unreleased — Foundation pass

First end-to-end skeleton committed. Everything is pre-alpha; APIs may
change without notice.

### Added

- **Workspace scaffolding** — pnpm + TypeScript strict + vitest + Playwright.
- **Shared primitives** — `Id`, `Clock`/`SystemClock`, `Json` types,
  `FakeClock` for tests, structured `Logger` (pino + sink). 29 tests.
- **DB layer** — SQLite via `better-sqlite3` + Drizzle. Inline migrations
  with `schema_meta` versioning. Foreign-key cascades. Repo with typed
  rows for batches, games, rounds, stages, players, participants. 18 tests.
- **State store** — generic scoped key-value with immutable/private/protected
  flags; every write emits to the append-only event log. 19 tests.
- **Treatments** — `defineTreatments(zodSchema, list)` with name validation,
  duplicate detection, and freeze-on-create deep-copy semantics. 8 tests.
- **Strategies** — assignment (`firstAvailable`, `balanced`, `strict`,
  `matchByFactor`) and lobby (`sharedLobby`, `individualLobby`) as small
  pure functions taking immutable contexts. 30 tests.
- **Callback runtime** — synchronous, transactional. `defineCallbacks` +
  hooks for batch/game/round/stage/player lifecycle. Sets are visible to
  immediate gets; exceptions in in-tx hooks roll back the action. 8 tests.
- **Auth** — HMAC-signed participant URL tokens (URL-safe base64), JWKS-
  based admin verifier (production), local-secret HS256 verifier + dev
  provider for local use. 22 tests.
- **HTTP API** — Hono app with REST endpoints, OpenAPI document, action
  endpoints under `/api/admin/{resource}/{id}/{action}`. Player zone at
  `/api/me` gated by HMAC token; admin zone at `/api/admin` gated by JWT.
  10 tests.
- **WebSocket broadcaster** — subscriber filters, catch-up cursor
  (`afterSeq`), live dispatch from event log. 6 tests.
- **`createEmpirica`** — top-level entrypoint that wires DB + runtime +
  auth + HTTP + broadcaster from a single options object. 2 tests.
- **Client SDK (vanilla)** — `EmpiricaClient` with auto-reconnect, replayed
  via cursor, snapshot store with subscriber API. 12 tests.
- **React hooks** — `EmpiricaProvider`, `useEmpirica`, `useSnapshot`,
  `usePlayer`, `useGame`, `useStage`. Built on `useSyncExternalStore`.
- **Admin UI** — React + Vite, served at `/admin/`. Pages: Login, Batches,
  Treatments, Participants. Live polling on the batches page. 3 tests.
- **`create-empirica`** — `npx create-empirica` scaffolder with embedded
  templates (no degit/network dep). Templates: minimal, solo, default,
  lobby-game. 4 tests.
- **Playwright** — three e2e specs covering /health, the admin login →
  treatment → batch → start flow, and participant-token /api/me access.
- **Docs** — `README.md`, `DESIGN.md`, `TESTING.md`, `OPEN_QUESTIONS.md`.

### Test pyramid (current)

| Layer        | Count |
|--------------|-------|
| Unit         | ~120  |
| Integration  | ~44   |
| E2E (Playwright) | 3 |

### Known gaps (next passes)

- WebSocket subscriber filters do not yet enforce per-player privacy at
  the server (only at the StateStore visibility layer). The HTTP layer
  currently grants admin-broadcast subscriptions only.
- `defer()` for slow async callbacks is in DESIGN.md but not implemented.
- The admin UI is functional but minimal — no live inspector, replay,
  export, or impersonation panels yet.
- The CLI proper (`empirica dev`/`start`/`export`) is not yet built; the
  template's `pnpm dev` invokes the server file directly.
- `useStage(stageId)` requires the user to thread the stage id through;
  there's no `useCurrentStage()` yet.
- Lobby strategy is wired into types but not yet integrated with the
  callback runtime's stage advancer.
