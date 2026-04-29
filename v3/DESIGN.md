# Empirica v3 Design

This document captures the architectural decisions and the intent behind them.
Decisions live here so we don't forget *why* we built things the way we did.

## Goals

1. **Simple to deploy.** One Node process, one SQLite file, one URL.
2. **Simple to develop on.** All TypeScript, single shipped package, no build dance.
3. **Solid foundations.** Heavy automated tests (vitest), typed end-to-end, no
   silent failures.
4. **Friendly to non-developer researchers** via a real admin UI and curated
   project templates.

## Top-level concepts (the user-visible model)

| Concept     | Meaning                                                       |
|-------------|---------------------------------------------------------------|
| Batch       | A launch unit with a treatment config and assignment rules.   |
| Treatment   | Named, typed factor dict; defined by user-supplied zod schema. |
| Game        | A concrete instance with assigned players running rounds/stages. |
| Round       | A logical loop iteration grouping stages (optional).          |
| Stage       | A timed step where players act; a stage can be of `kind: "lobby"`. |
| Player      | A participant inside a game (with optional cross-batch `participantId`). |
| Globals     | Server-wide KV.                                               |

Compared to v1/v2:
- `Lobby` is **not a top-level concept**; it's a stage kind.
- `PlayerGame` / `PlayerRound` / `PlayerStage` are **not separate scopes**;
  per-(player,scope) data is just a row in the `state` table, surfaced through
  the SDK as `player.stage.set("answer", x)`.
- `Participant` is collapsed into `Player.participantId` (optional).

## Data model

SQLite via `better-sqlite3` + Drizzle ORM. Single file (`./data/empirica.db`
by default). Two kinds of tables:

**Structural** — the things with known shape:
- `batches`, `treatments`, `games`, `rounds`, `stages`, `players`, `participants`,
  `globals`, `admins`, `sessions`.

**Generic state**:
- `state(scope_kind, scope_id, key, value_json, updated_at)` — append/upsert
  KV per scope. Replaces the v2 attribute system.
- `events(id, scope_kind, scope_id, key, value_json, by, at)` — append-only
  log. Source of truth for replay, history, and export.

Treatments are **frozen into games on creation** (deep copy on the `games` row).
Editing a treatment never mutates running games.

## Runtime

Single Node process (Node 20+):
- HTTP via [Hono](https://hono.dev), one server.
- WebSocket on the same port for live subscriptions (`@hono/node-ws`).
- DB via `better-sqlite3` (sync) + Drizzle.
- Logging via pino (console + file by default).
- User callbacks imported directly — **no child process, no IPC**.

The admin UI is a separate Vite-built static bundle that the runtime serves
from `/admin`. The same client SDK that players use also drives the admin.

## Callback semantics

The single most important contract.

- Each callback runs inside a **single SQLite transaction**
  (`BEGIN IMMEDIATE` → `COMMIT`).
- All `get` / `set` are **synchronous** (better-sqlite3 is sync). After
  `set("x", 1)`, an immediate `get("x")` returns `1`. Always.
- The transaction commits when the callback returns. On exception the tx is
  rolled back, the error is logged, and state is untouched.
- Diffs are broadcast to subscribers **after** commit.
- Callbacks run **serially per game** (and per batch for batch-level events).
  Different games run concurrently and isolated.

For slow async work (LLM calls, external APIs):

```ts
on.stageEnded(({ game, defer }) => {
  game.set("status", "scoring"); // sync, in-tx

  defer(async () => {
    const reply = await llm.complete(...); // outside any tx
    return ({ game }) => {
      // runs in a fresh tx after the async work resolves
      game.set("aiFeedback", reply);
    };
  });
});
```

Sync callbacks have a soft budget (default 200 ms); exceeding it logs a
warning. The runtime never silently awaits arbitrary user promises during
hot paths.

## Treatments

User-defined zod schema is the source of truth:

```ts
import { defineTreatments, z } from "empirica/server";

const Factors = z.object({
  playerCount: z.number().int().positive(),
  rounds: z.number().int().positive(),
});

export default defineTreatments(Factors, [
  { name: "solo",  factors: { playerCount: 1, rounds: 5 } },
  { name: "group", factors: { playerCount: 4, rounds: 5 } },
]);
```

- TS-first; YAML loader available via the same schema.
- Validation errors are loud and surfaced in the admin UI.
- Frozen at game-creation time (deep clone onto `games.treatment_json`).
- Runtime-definable from the admin UI (subject to the same schema).

## Assignment & lobby strategies

A handful of small composable functions, each ~20 lines:

```ts
import { strategies } from "empirica/server";

export const assignment = strategies.balanced;
export const lobby      = strategies.sharedLobby({ readyTimeout: "60s" });
```

Built-in:
- `firstAvailable` — first open game wins (default).
- `balanced` — prefer underbooked games, allow overbook fallback.
- `strict` — never overbook; overflow waits or exits.
- `matchByFactor("groupKey")` — match on a factor.

Custom is just a function:

```ts
export const assignment: AssignmentFn = ({ player, openGames }) => {
  return openGames[0] ? { gameId: openGames[0].id } : { wait: true };
};
```

Lobby is a stage `kind`; it runs the configured strategy when entered.

## Auth

- **Admins**: external JWT verification via `jose` + JWKS. Pluggable verifiers
  (Firebase, Auth0, Clerk, generic OIDC, dev provider). The server itself has
  no signup; admin identities come from the IdP.
- **Participants**: short-lived HMAC-signed URL tokens. No JWT, no provider
  dependency. The token encodes `(participantId, batchId, exp)` and is
  validated server-side. URL form: `?p=<token>`.

Local dev: built-in dev provider issues JWTs from a config-file admin password
and supports magic-link participant onboarding without external services.

## API

REST + OpenAPI for everything the admin UI does (so users can script it).
- Standard CRUD where it fits.
- Action endpoints use the colon-suffix convention (Google AIP):
  `POST /batches/{id}:start`, `POST /games/{id}:end`,
  `POST /players/{id}:reassign`.
- Live state via a single WebSocket: `GET /ws` (Bearer or HMAC token);
  subscriptions are scope filters (`{ subscribe: ["batch:*"] }`); server
  pushes JSON patches.

## Templates

Shipped via `npx create-empirica@latest` with embedded files (no degit, no GH
dependency at install time):

- `default` (flags `--tailwind`, `--with-chat`, `--with-examples`) — canonical multiplayer.
- `minimal` — empty starter.
- `solo` — single-player, no assignment/lobby.
- `lobby-game` — multiplayer with explicit lobby + matchmaking demo.

## Testing

See [TESTING.md](./TESTING.md). Short version: vitest everywhere; integration
tests against a real in-memory SQLite; no mocking what we own; black-box
contract tests for the SDK; deterministic seeded clocks for time-based tests.

## Out of scope (intentionally)

- Multiple persistence backends. SQLite only. (Postgres later, only if real demand.)
- Distributed deployments. Single process.
- Migration from v2 data. Clean break; export/import is the bridge.
- Non-React UIs as first-class. React is the supported target; the vanilla
  client SDK is the escape hatch.
