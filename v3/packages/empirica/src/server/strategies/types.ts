import type { Id } from "../../shared/id.js";
import type { JsonObject } from "../../shared/json.js";
import type { BatchRow, GameRow, PlayerRow, StageRow } from "../db/repo.js";

// Strategy types
//
// A strategy is a pure function from an immutable context to a decision. The
// runtime calls strategies inside a SQLite transaction at well-defined
// trigger points (player connect, intro done, game end, batch start). The
// decision is then applied in the same tx and committed atomically.
//
// Strategies must not perform I/O. They must not call clocks or random
// number generators directly — the runtime supplies a `random` seed and
// `now` so behavior is reproducible in tests.

// ── assignment ─────────────────────────────────────────────────────────────

export type AssignmentDecision =
  /** Place the player into this game. */
  | { gameId: Id<"game"> }
  /** Player will wait; runtime will retry on relevant triggers. */
  | { wait: true }
  /** Player exits the experiment with the given reason. */
  | { exit: string };

export interface AssignmentContext {
  /** The player being assigned. */
  player: PlayerRow;
  /** All batches, in creation order. The strategy decides which to consider. */
  batches: ReadonlyArray<BatchRow>;
  /** Games per batch, in creation order. Includes ended/terminated games. */
  gamesByBatch: ReadonlyMap<Id<"batch">, ReadonlyArray<GameRow>>;
  /** Currently-assigned players per game (excluding ended/exited). */
  playersByGame: ReadonlyMap<Id<"game">, ReadonlyArray<PlayerRow>>;
  /** The runtime's view of "now" (ms since epoch). */
  now: number;
  /** Deterministic random source: returns floats in [0, 1). */
  random(): number;
  /**
   * Extra game ids the caller wants ignored (e.g., a game that just kicked
   * this player out). Strategies should respect this set.
   */
  skip?: ReadonlySet<Id<"game">>;
}

export type AssignmentFn = (ctx: AssignmentContext) => AssignmentDecision;

// ── lobby ──────────────────────────────────────────────────────────────────

export type LobbyDecision =
  /** Lobby is satisfied; the runtime will start the game. */
  | { ready: true }
  /**
   * Continue waiting. `until` (ms since epoch) tells the runtime when to
   * re-check (timeout expiry); omitted means "only re-check on player
   * events."
   */
  | { wait: true; until?: number }
  /** Lobby has failed; the runtime will fail the game with `reason`. */
  | { fail: string };

export interface LobbyContext {
  game: GameRow;
  stage: StageRow;
  /** Players whose status is "lobby" or "playing" for this game. */
  players: ReadonlyArray<PlayerRow>;
  /** Subset of `players` that have signalled readiness. */
  ready: ReadonlyArray<PlayerRow>;
  /** The frozen treatment factors. */
  treatment: JsonObject;
  /** Lobby config snapshot frozen on this stage. */
  config: LobbyConfig;
  now: number;
  /** When the lobby stage started, ms since epoch. */
  startedAt: number;
}

export type LobbyFn = (ctx: LobbyContext) => LobbyDecision;

export interface LobbyConfig {
  /** Required ready players for `shared`; per-player timer for `individual`. */
  kind: "shared" | "individual";
  /** Lobby timeout in ms. */
  durationMs: number;
  /** When the timer expires: */
  strategy: "fail" | "ignore";
}

// ── helpers consumed by strategies ─────────────────────────────────────────

export function getPlayerCount(treatment: JsonObject): number | undefined {
  const v = treatment["playerCount"];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

export function isGameOpen(g: GameRow): boolean {
  return g.status === "created" || g.status === "lobby";
}
