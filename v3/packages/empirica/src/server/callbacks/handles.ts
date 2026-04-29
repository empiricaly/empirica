import type { Id } from "../../shared/id.js";
import type { Json, JsonObject } from "../../shared/json.js";
import type { Repo, RoundRow, StageRow } from "../db/repo.js";
import { StateStore, type ScopeRef } from "../state/store.js";
import type {
  AddStageInput,
  BatchHandle,
  GameHandle,
  PlayerHandle,
  RoundHandle,
  SetOptions,
  StageHandle,
} from "./types.js";

// Handle implementations.
//
// Constructed once per transaction by the runtime. Each handle is a thin
// wrapper around `(repo, store)` that provides a friendly API. Mutations
// are synchronous; the active SQLite tx makes them atomic.

export interface HandleDeps {
  repo: Repo;
  store: StateStore;
  /** Records hook firings to flush after the current handler returns. */
  enqueue(event: PendingEvent): void;
  /** "runtime" | "player:..." | "admin:..."; recorded on events. */
  by: string;
}

export type PendingEvent =
  | { kind: "gameCreated"; gameId: Id<"game"> }
  | { kind: "gameStarted"; gameId: Id<"game"> }
  | { kind: "gameEnded"; gameId: Id<"game">; reason: string }
  | { kind: "stageEnded"; stageId: Id<"stage">; cause: "ended-by-callback" }
  | { kind: "playerExited"; playerId: Id<"player">; reason: string };

export class BatchHandleImpl implements BatchHandle {
  readonly id;
  readonly row;
  private readonly scope: ScopeRef;

  constructor(
    private readonly d: HandleDeps,
    row: BatchHandle["row"],
  ) {
    this.id = row.id;
    this.row = row;
    this.scope = { kind: "batch", id: row.id };
  }

  get(key: string): Json | undefined {
    return this.d.store.get(this.scope, key);
  }
  set(key: string, value: Json, opts: SetOptions = {}): void {
    this.d.store.set(this.scope, key, value, { ...opts, by: this.d.by });
  }
  end(reason: string): void {
    this.d.repo.setBatchStatus(this.id, "ended", reason);
  }
  games(): GameHandle[] {
    return this.d.repo
      .gamesInBatch(this.id)
      .map((g) => new GameHandleImpl(this.d, g, this));
  }
}

export class GameHandleImpl implements GameHandle {
  readonly id;
  readonly row;
  readonly batch;
  readonly treatment;
  private readonly scope: ScopeRef;

  constructor(
    private readonly d: HandleDeps,
    row: GameHandle["row"],
    batch: BatchHandle,
  ) {
    this.id = row.id;
    this.row = row;
    this.batch = batch;
    this.treatment = row.treatment;
    this.scope = { kind: "game", id: row.id };
  }

  get(key: string): Json | undefined {
    return this.d.store.get(this.scope, key);
  }
  set(key: string, value: Json, opts: SetOptions = {}): void {
    this.d.store.set(this.scope, key, value, { ...opts, by: this.d.by });
  }
  addRound(input: { name?: string } = {}): RoundHandle {
    const round = input.name === undefined
      ? this.d.repo.createRound({ gameId: this.id })
      : this.d.repo.createRound({ gameId: this.id, name: input.name });
    return new RoundHandleImpl(this.d, round, this);
  }
  addStage(input: AddStageInput): StageHandle {
    const stage = this.d.repo.createStage({
      gameId: this.id,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.kind !== undefined && { kind: input.kind }),
      durationMs: input.durationMs,
    });
    return new StageHandleImpl(this.d, stage, this, null);
  }
  rounds(): RoundHandle[] {
    return this.d.repo
      .roundsInGame(this.id)
      .map((r) => new RoundHandleImpl(this.d, r, this));
  }
  stages(): StageHandle[] {
    return this.d.repo
      .stagesInGame(this.id)
      .map((s) => new StageHandleImpl(this.d, s, this, this.findRoundFor(s)));
  }
  players(): PlayerHandle[] {
    return this.d.repo
      .playersInGame(this.id)
      .map((p) => new PlayerHandleImpl(this.d, p, this));
  }
  end(reason: string): void {
    this.d.repo.setGameStatus(this.id, "ended", reason);
    this.d.enqueue({ kind: "gameEnded", gameId: this.id, reason });
  }

  private findRoundFor(stage: StageRow): RoundHandle | null {
    if (!stage.roundId) return null;
    const r = this.d.repo.round(stage.roundId);
    return r ? new RoundHandleImpl(this.d, r, this) : null;
  }
}

export class RoundHandleImpl implements RoundHandle {
  readonly id;
  readonly row;
  readonly game;
  private readonly scope: ScopeRef;

  constructor(
    private readonly d: HandleDeps,
    row: RoundRow,
    game: GameHandle,
  ) {
    this.id = row.id;
    this.row = row;
    this.game = game;
    this.scope = { kind: "round", id: row.id };
  }

  get(key: string): Json | undefined {
    return this.d.store.get(this.scope, key);
  }
  set(key: string, value: Json, opts: SetOptions = {}): void {
    this.d.store.set(this.scope, key, value, { ...opts, by: this.d.by });
  }
  addStage(input: AddStageInput): StageHandle {
    const stage = this.d.repo.createStage({
      gameId: this.game.id,
      roundId: this.id,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.kind !== undefined && { kind: input.kind }),
      durationMs: input.durationMs,
    });
    return new StageHandleImpl(this.d, stage, this.game, this);
  }
  stages(): StageHandle[] {
    return this.d.repo
      .stagesInGame(this.game.id)
      .filter((s) => s.roundId === this.id)
      .map((s) => new StageHandleImpl(this.d, s, this.game, this));
  }
}

export class StageHandleImpl implements StageHandle {
  readonly id;
  readonly row;
  readonly game;
  readonly round;
  private readonly scope: ScopeRef;

  constructor(
    private readonly d: HandleDeps,
    row: StageRow,
    game: GameHandle,
    round: RoundHandle | null,
  ) {
    this.id = row.id;
    this.row = row;
    this.game = game;
    this.round = round;
    this.scope = { kind: "stage", id: row.id };
  }

  get(key: string): Json | undefined {
    return this.d.store.get(this.scope, key);
  }
  set(key: string, value: Json, opts: SetOptions = {}): void {
    this.d.store.set(this.scope, key, value, { ...opts, by: this.d.by });
  }
}

export class PlayerHandleImpl implements PlayerHandle {
  readonly id;
  readonly row;
  readonly game;
  private readonly scope: ScopeRef;

  constructor(
    private readonly d: HandleDeps,
    row: PlayerHandle["row"],
    game: GameHandle | null,
  ) {
    this.id = row.id;
    this.row = row;
    this.game = game;
    this.scope = { kind: "player", id: row.id };
  }

  get(key: string): Json | undefined {
    return this.d.store.get(this.scope, key);
  }
  set(key: string, value: Json, opts: SetOptions = {}): void {
    this.d.store.set(this.scope, key, value, { ...opts, by: this.d.by });
  }
  setStageData(stage: StageHandle, key: string, value: Json, opts: SetOptions = {}): void {
    this.d.store.set(
      { kind: "playerStage", id: `${this.id}:${stage.id}` },
      key,
      value,
      { ...opts, by: this.d.by },
    );
  }
  getStageData(stage: StageHandle, key: string): Json | undefined {
    return this.d.store.get({ kind: "playerStage", id: `${this.id}:${stage.id}` }, key);
  }
  setRoundData(round: RoundHandle, key: string, value: Json, opts: SetOptions = {}): void {
    this.d.store.set(
      { kind: "playerRound", id: `${this.id}:${round.id}` },
      key,
      value,
      { ...opts, by: this.d.by },
    );
  }
  getRoundData(round: RoundHandle, key: string): Json | undefined {
    return this.d.store.get({ kind: "playerRound", id: `${this.id}:${round.id}` }, key);
  }
  exit(reason: string): void {
    this.d.repo.setPlayerStatus(this.id, "exited", reason);
    this.d.enqueue({ kind: "playerExited", playerId: this.id, reason });
  }
}

export type _Game = JsonObject;
