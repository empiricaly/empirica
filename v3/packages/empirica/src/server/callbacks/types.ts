import type { Json, JsonObject } from "../../shared/json.js";
import type { Id } from "../../shared/id.js";
import type {
  BatchRow,
  GameRow,
  PlayerRow,
  RoundRow,
  StageRow,
} from "../db/repo.js";

// Callback runtime types
//
// The user authors callbacks against handles (BatchHandle, GameHandle, etc.)
// that read/write through the runtime's transaction. Handles are
// short-lived: they're valid only inside the callback that received them.

export interface BatchHandle {
  readonly id: Id<"batch">;
  readonly row: BatchRow;
  get(key: string): Json | undefined;
  set(key: string, value: Json, opts?: SetOptions): void;
  end(reason: string): void;
  games(): GameHandle[];
}

export interface GameHandle {
  readonly id: Id<"game">;
  readonly row: GameRow;
  readonly batch: BatchHandle;
  /** The frozen treatment factors. */
  readonly treatment: JsonObject;
  get(key: string): Json | undefined;
  set(key: string, value: Json, opts?: SetOptions): void;
  addRound(input: { name?: string }): RoundHandle;
  addStage(input: AddStageInput): StageHandle;
  rounds(): RoundHandle[];
  stages(): StageHandle[];
  players(): PlayerHandle[];
  end(reason: string): void;
}

export interface RoundHandle {
  readonly id: Id<"round">;
  readonly row: RoundRow;
  readonly game: GameHandle;
  get(key: string): Json | undefined;
  set(key: string, value: Json, opts?: SetOptions): void;
  addStage(input: AddStageInput): StageHandle;
  stages(): StageHandle[];
}

export interface StageHandle {
  readonly id: Id<"stage">;
  readonly row: StageRow;
  readonly game: GameHandle;
  readonly round: RoundHandle | null;
  get(key: string): Json | undefined;
  set(key: string, value: Json, opts?: SetOptions): void;
}

export interface PlayerHandle {
  readonly id: Id<"player">;
  readonly row: PlayerRow;
  readonly game: GameHandle | null;
  get(key: string): Json | undefined;
  set(key: string, value: Json, opts?: SetOptions): void;
  setStageData(stage: StageHandle, key: string, value: Json, opts?: SetOptions): void;
  getStageData(stage: StageHandle, key: string): Json | undefined;
  setRoundData(round: RoundHandle, key: string, value: Json, opts?: SetOptions): void;
  getRoundData(round: RoundHandle, key: string): Json | undefined;
  exit(reason: string): void;
}

export interface SetOptions {
  immutable?: boolean;
  private?: boolean;
}

export interface AddStageInput {
  name?: string;
  /** Duration in ms. Use parseDuration for "30s"-style strings. */
  durationMs: number;
  kind?: "interactive" | "lobby";
}

// ── Hook events ─────────────────────────────────────────────────────────────

export interface BatchCreatedEvent {
  batch: BatchHandle;
}
export interface BatchStartedEvent {
  batch: BatchHandle;
}
export interface BatchEndedEvent {
  batch: BatchHandle;
  reason: string;
}
export interface GameCreatedEvent {
  game: GameHandle;
}
export interface GameStartedEvent {
  game: GameHandle;
}
export interface GameEndedEvent {
  game: GameHandle;
  reason: string;
}
export interface RoundStartedEvent {
  round: RoundHandle;
  game: GameHandle;
}
export interface RoundEndedEvent {
  round: RoundHandle;
  game: GameHandle;
}
export interface StageStartedEvent {
  stage: StageHandle;
  round: RoundHandle | null;
  game: GameHandle;
}
export interface StageEndedEvent {
  stage: StageHandle;
  round: RoundHandle | null;
  game: GameHandle;
  /** Why the stage ended: "timeout" | "all-submitted" | "ended-by-callback" */
  cause: "timeout" | "all-submitted" | "ended-by-callback";
}
export interface PlayerJoinedEvent {
  player: PlayerHandle;
}
export interface PlayerAssignedEvent {
  player: PlayerHandle;
  game: GameHandle;
}
export interface PlayerExitedEvent {
  player: PlayerHandle;
  reason: string;
}

export type HookHandlers = {
  batchCreated: (e: BatchCreatedEvent) => void;
  batchStarted: (e: BatchStartedEvent) => void;
  batchEnded: (e: BatchEndedEvent) => void;
  gameCreated: (e: GameCreatedEvent) => void;
  gameStarted: (e: GameStartedEvent) => void;
  gameEnded: (e: GameEndedEvent) => void;
  roundStarted: (e: RoundStartedEvent) => void;
  roundEnded: (e: RoundEndedEvent) => void;
  stageStarted: (e: StageStartedEvent) => void;
  stageEnded: (e: StageEndedEvent) => void;
  playerJoined: (e: PlayerJoinedEvent) => void;
  playerAssigned: (e: PlayerAssignedEvent) => void;
  playerExited: (e: PlayerExitedEvent) => void;
};

export type HookEvent = keyof HookHandlers;
