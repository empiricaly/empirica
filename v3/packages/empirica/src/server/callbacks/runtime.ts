import type { Clock } from "../../shared/clock.js";
import type { Id } from "../../shared/id.js";
import type { Json, JsonObject } from "../../shared/json.js";
import type { Db } from "../db/db.js";
import { Repo, type GameRow } from "../db/repo.js";
import type { Logger } from "../logger.js";
import { EventLog } from "../state/events.js";
import { StateStore } from "../state/store.js";
import {
  type AssignmentContext,
  type AssignmentDecision,
  type AssignmentFn,
  strategies as assignmentStrategies,
} from "../strategies/assignment.js";
import {
  BatchHandleImpl,
  GameHandleImpl,
  PlayerHandleImpl,
  RoundHandleImpl,
  StageHandleImpl,
  type HandleDeps,
  type PendingEvent,
} from "./handles.js";
import { HookRegistry } from "./hooks.js";

// Runtime
//
// Owns the Db, repo, store, hooks, strategies, and lifecycle scheduling.
// Public API is small: openBatch, createGame, addPlayer, assign, runTimers,
// and a `tx()` helper that exposes a transaction-scoped API to internal
// callers and tests. All public mutations go through tx().

export interface RuntimeOptions {
  db: Db;
  hooks: HookRegistry;
  clock: Clock;
  logger: Logger;
  /** Default: assignmentStrategies.firstAvailable. */
  assignment?: AssignmentFn;
  /** Optional deterministic random source; default Math.random. */
  random?: () => number;
}

export interface TxApi {
  readonly repo: Repo;
  readonly store: StateStore;
  /** Get a BatchHandle by id, or undefined if not found. */
  batch(id: Id<"batch">): BatchHandleImpl | undefined;
  /** Get a GameHandle by id, or undefined. */
  game(id: Id<"game">): GameHandleImpl | undefined;
  /** Get a PlayerHandle by id, or undefined. */
  player(id: Id<"player">): PlayerHandleImpl | undefined;
}

export class Runtime {
  readonly db: Db;
  readonly repo: Repo;
  readonly store: StateStore;
  readonly events: EventLog;
  readonly hooks: HookRegistry;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly assignment: AssignmentFn;
  readonly random: () => number;

  constructor(opts: RuntimeOptions) {
    this.db = opts.db;
    this.clock = opts.clock;
    this.logger = opts.logger;
    this.repo = new Repo(this.db, () => this.clock.now());
    this.store = new StateStore(this.db, () => this.clock.now());
    this.events = new EventLog(this.db);
    this.hooks = opts.hooks;
    this.assignment = opts.assignment ?? assignmentStrategies.firstAvailable;
    this.random = opts.random ?? Math.random;
  }

  /**
   * Run `fn` inside a SQLite transaction. The function gets a TxApi and a
   * pending-events queue. Hooks fired by the function (via handle methods)
   * are accumulated and dispatched after commit, each in its own tx.
   */
  tx<T>(by: string, fn: (api: TxApi, enqueue: (e: PendingEvent) => void) => T): T {
    const pending: PendingEvent[] = [];
    const enqueue = (e: PendingEvent) => pending.push(e);

    const result = this.db.$sqlite.transaction(() => {
      const api = this.makeTxApi(by, enqueue);
      return fn(api, enqueue);
    })();

    this.flushPending(pending, by);
    return result;
  }

  // ── public operations (each runs as its own tx by default) ─────────────

  /** Mark a batch as running and create initial games per its config. */
  startBatch(
    id: Id<"batch">,
    plan: ReadonlyArray<{ treatment: JsonObject; treatmentName?: string; count: number }>,
  ): void {
    this.tx("runtime", (api, enqueue) => {
      const batch = api.batch(id);
      if (!batch) throw new Error(`startBatch: no batch ${id}`);

      for (const slot of plan) {
        for (let i = 0; i < slot.count; i++) {
          const g = this.repo.createGame({
            batchId: id,
            treatment: slot.treatment,
            ...(slot.treatmentName !== undefined && { treatmentName: slot.treatmentName }),
          });
          enqueue({ kind: "gameCreated", gameId: g.id });
        }
      }

      this.repo.setBatchStatus(id, "running");
      this.hooks.fire("batchStarted", { batch });
    });
  }

  /**
   * Try to place an unassigned player according to the configured assignment
   * strategy. Returns the decision actually applied.
   */
  assign(playerId: Id<"player">, skip?: ReadonlySet<Id<"game">>): AssignmentDecision {
    return this.tx("runtime", (api) => {
      const player = api.player(playerId);
      if (!player) throw new Error(`assign: no player ${playerId}`);
      if (player.row.gameId !== null) {
        return { gameId: player.row.gameId };
      }

      const ctx = this.buildAssignmentCtx(player.row, skip);
      const decision = this.assignment(ctx);

      if ("gameId" in decision) {
        this.repo.assignPlayerToGame(player.id, decision.gameId);
        const game = api.game(decision.gameId);
        if (game) this.hooks.fire("playerAssigned", { player, game });
      } else if ("exit" in decision) {
        this.repo.setPlayerStatus(player.id, "exited", decision.exit);
        this.hooks.fire("playerExited", { player, reason: decision.exit });
      }
      return decision;
    });
  }

  /**
   * Move a game from "created"/"lobby" into "running" and start its first
   * stage. The game must already have at least one stage; the first stage is
   * `stages()[0]`.
   */
  startGame(gameId: Id<"game">): void {
    this.tx("runtime", (api) => {
      const game = api.game(gameId);
      if (!game) throw new Error(`startGame: no game ${gameId}`);
      if (game.row.status === "running") return;

      this.repo.setGameStatus(gameId, "running");
      const fresh = api.game(gameId);
      if (!fresh) throw new Error("game vanished mid-tx");
      this.hooks.fire("gameStarted", { game: fresh });

      const stages = fresh.stages();
      const first = stages[0];
      if (first) this.startStageInternal(fresh.id, first.id);
    });
  }

  /** End the current stage of a game and move to the next, or end the game. */
  advanceStage(gameId: Id<"game">, cause: "timeout" | "all-submitted" | "ended-by-callback"): void {
    this.tx("runtime", (api) => {
      const game = api.game(gameId);
      if (!game || game.row.status !== "running") return;

      const currentId = game.row.currentStageId;
      if (!currentId) return;
      const stages = game.stages();
      const current = stages.find((s) => s.id === currentId);
      if (!current) return;

      // End the current stage.
      this.repo.setStageEnded(current.id, this.clock.now());
      const round = current.round;
      this.hooks.fire("stageEnded", { stage: current, round, game, cause });

      if (round) {
        const remainingInRound = round
          .stages()
          .filter((s) => s.row.endedAt === null && s.id !== current.id);
        if (remainingInRound.length === 0) {
          this.hooks.fire("roundEnded", { round, game });
        }
      }

      const next = stages.find((s) => s.row.endedAt === null && s.id !== current.id);
      if (next) {
        if (next.round && (!round || round.id !== next.round.id)) {
          this.hooks.fire("roundStarted", { round: next.round, game });
        }
        this.startStageInternal(game.id, next.id);
      } else {
        this.repo.setGameStatus(gameId, "ended", "all stages complete");
        this.hooks.fire("gameEnded", { game, reason: "all stages complete" });
      }
    });
  }

  // ── internals ──────────────────────────────────────────────────────────

  private startStageInternal(gameId: Id<"game">, stageId: Id<"stage">): void {
    const now = this.clock.now();
    const stage = this.repo.stage(stageId);
    if (!stage) return;
    this.repo.setGameCurrentStage(gameId, stageId);
    this.repo.setStageStarted(stageId, now, now + stage.durationMs);

    // Schedule the timeout via the injected clock. Fires in its own tx.
    this.clock.setTimeout(() => {
      // The stage may have ended early; advanceStage no-ops in that case.
      this.advanceStage(gameId, "timeout");
    }, stage.durationMs);

    const game = this.makeTxApi("runtime", () => {}).game(gameId);
    const fresh = this.repo.stage(stageId);
    if (game && fresh) {
      const deps = this.handleDeps("runtime", () => {});
      const round = fresh.roundId
        ? new RoundHandleImpl(deps, this.repo.round(fresh.roundId)!, game)
        : null;
      const stageHandle = new StageHandleImpl(deps, fresh, game, round);
      this.hooks.fire("stageStarted", { stage: stageHandle, round, game });
    }
  }

  private makeTxApi(by: string, enqueue: (e: PendingEvent) => void): TxApi {
    const deps = this.handleDeps(by, enqueue);

    const batch = (id: Id<"batch">): BatchHandleImpl | undefined => {
      const row = this.repo.batch(id);
      return row ? new BatchHandleImpl(deps, row) : undefined;
    };
    const game = (id: Id<"game">): GameHandleImpl | undefined => {
      const row = this.repo.game(id);
      if (!row) return undefined;
      const b = batch(row.batchId);
      if (!b) return undefined;
      return new GameHandleImpl(deps, row, b);
    };
    const player = (id: Id<"player">): PlayerHandleImpl | undefined => {
      const row = this.repo.player(id);
      if (!row) return undefined;
      const g = row.gameId ? game(row.gameId) ?? null : null;
      return new PlayerHandleImpl(deps, row, g);
    };
    return { repo: this.repo, store: this.store, batch, game, player };
  }

  private handleDeps(by: string, enqueue: (e: PendingEvent) => void): HandleDeps {
    return { repo: this.repo, store: this.store, by, enqueue };
  }

  private buildAssignmentCtx(
    player: ReturnType<Repo["player"]>,
    skip?: ReadonlySet<Id<"game">>,
  ): AssignmentContext {
    if (!player) throw new Error("assignment: missing player row");
    const batches = this.repo.listBatches();
    const gamesByBatch = new Map<Id<"batch">, GameRow[]>();
    const playersByGame = new Map<Id<"game">, ReturnType<Repo["playersInGame"]>>();
    for (const b of batches) gamesByBatch.set(b.id, this.repo.gamesInBatch(b.id));
    for (const list of gamesByBatch.values()) {
      for (const g of list) playersByGame.set(g.id, this.repo.playersInGame(g.id));
    }
    const ctx: AssignmentContext = {
      player,
      batches,
      gamesByBatch,
      playersByGame,
      now: this.clock.now(),
      random: this.random,
    };
    if (skip) (ctx as { skip?: ReadonlySet<Id<"game">> }).skip = skip;
    return ctx;
  }

  private flushPending(events: PendingEvent[], by: string): void {
    for (const e of events) {
      try {
        this.tx(by, (api) => {
          switch (e.kind) {
            case "gameCreated": {
              const g = api.game(e.gameId);
              if (g) this.hooks.fire("gameCreated", { game: g });
              break;
            }
            case "gameStarted": {
              const g = api.game(e.gameId);
              if (g) this.hooks.fire("gameStarted", { game: g });
              break;
            }
            case "gameEnded": {
              const g = api.game(e.gameId);
              if (g) this.hooks.fire("gameEnded", { game: g, reason: e.reason });
              break;
            }
            case "stageEnded":
              // Driven by advanceStage; nothing to do here.
              break;
            case "playerExited": {
              const p = api.player(e.playerId);
              if (p) this.hooks.fire("playerExited", { player: p, reason: e.reason });
              break;
            }
          }
        });
      } catch (err) {
        this.logger.error("hook handler threw", { event: e, err: String(err) });
      }
    }
  }
}

export { assignmentStrategies };
