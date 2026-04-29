import type { Json, JsonObject } from "../../shared/json.js";
import { newId, type Id } from "../../shared/id.js";
import type { Db } from "./db.js";

// Repository / model layer
//
// Thin typed wrapper around the structural tables. No business logic — that
// lives in strategies and the callback runtime. The repo's job is to make
// inserts and reads strictly typed and consistent.
//
// All ids are minted here (caller doesn't pass them in). Times default to
// the injected clock's `now()`.

export interface BatchRow {
  id: Id<"batch">;
  status: BatchStatus;
  config: JsonObject;
  lobbyConfig: JsonObject | null;
  name: string | null;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  endedReason: string | null;
}

export interface GameRow {
  id: Id<"game">;
  batchId: Id<"batch">;
  treatment: JsonObject;
  treatmentName: string | null;
  status: GameStatus;
  currentStageId: Id<"stage"> | null;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  endedReason: string | null;
}

export interface RoundRow {
  id: Id<"round">;
  gameId: Id<"game">;
  idx: number;
  name: string | null;
  startedAt: number | null;
  endedAt: number | null;
  createdAt: number;
}

export interface StageRow {
  id: Id<"stage">;
  gameId: Id<"game">;
  roundId: Id<"round"> | null;
  idx: number;
  name: string | null;
  kind: "interactive" | "lobby";
  durationMs: number;
  startedAt: number | null;
  endsAt: number | null;
  endedAt: number | null;
  lobbyConfig: JsonObject | null;
  createdAt: number;
}

export interface PlayerRow {
  id: Id<"player">;
  gameId: Id<"game"> | null;
  batchId: Id<"batch"> | null;
  participantId: Id<"participant"> | null;
  status: PlayerStatus;
  endedReason: string | null;
  createdAt: number;
  endedAt: number | null;
}

export interface ParticipantRow {
  id: Id<"participant">;
  identifier: string;
  metadata: JsonObject;
  createdAt: number;
}

export type BatchStatus = "created" | "running" | "ended" | "terminated" | "failed";
export type GameStatus =
  | "created"
  | "lobby"
  | "running"
  | "ended"
  | "terminated"
  | "failed";
export type PlayerStatus = "waiting" | "lobby" | "playing" | "ended" | "exited";

export class Repo {
  constructor(
    private readonly db: Db,
    private readonly now: () => number,
  ) {}

  // ── batches ────────────────────────────────────────────────────────────

  createBatch(input: {
    config: JsonObject;
    lobbyConfig?: JsonObject;
    name?: string;
  }): BatchRow {
    const id = newId<"batch">();
    const at = this.now();
    this.db.$sqlite
      .prepare(
        `INSERT INTO batches(id, status, config_json, lobby_config_json, name, created_at)
         VALUES (?, 'created', ?, ?, ?, ?)`,
      )
      .run(
        id,
        JSON.stringify(input.config),
        input.lobbyConfig ? JSON.stringify(input.lobbyConfig) : null,
        input.name ?? null,
        at,
      );
    return this.batch(id)!;
  }

  batch(id: Id<"batch">): BatchRow | undefined {
    const r = this.db.$sqlite.prepare(`SELECT * FROM batches WHERE id = ?`).get(id);
    return r ? toBatch(r as BatchDbRow) : undefined;
  }

  listBatches(): BatchRow[] {
    return (
      this.db.$sqlite
        .prepare(`SELECT * FROM batches ORDER BY created_at`)
        .all() as BatchDbRow[]
    ).map(toBatch);
  }

  setBatchStatus(id: Id<"batch">, status: BatchStatus, reason?: string): void {
    const at = this.now();
    if (status === "running") {
      this.db.$sqlite
        .prepare(
          `UPDATE batches SET status = ?, started_at = COALESCE(started_at, ?) WHERE id = ?`,
        )
        .run(status, at, id);
    } else if (status === "ended" || status === "terminated" || status === "failed") {
      this.db.$sqlite
        .prepare(
          `UPDATE batches SET status = ?, ended_at = ?, ended_reason = ? WHERE id = ?`,
        )
        .run(status, at, reason ?? null, id);
    } else {
      this.db.$sqlite.prepare(`UPDATE batches SET status = ? WHERE id = ?`).run(status, id);
    }
  }

  // ── games ──────────────────────────────────────────────────────────────

  createGame(input: {
    batchId: Id<"batch">;
    treatment: JsonObject;
    treatmentName?: string;
  }): GameRow {
    const id = newId<"game">();
    const at = this.now();
    this.db.$sqlite
      .prepare(
        `INSERT INTO games(id, batch_id, treatment_json, treatment_name, status, created_at)
         VALUES (?, ?, ?, ?, 'created', ?)`,
      )
      .run(id, input.batchId, JSON.stringify(input.treatment), input.treatmentName ?? null, at);
    return this.game(id)!;
  }

  game(id: Id<"game">): GameRow | undefined {
    const r = this.db.$sqlite.prepare(`SELECT * FROM games WHERE id = ?`).get(id);
    return r ? toGame(r as GameDbRow) : undefined;
  }

  gamesInBatch(batchId: Id<"batch">): GameRow[] {
    return (
      this.db.$sqlite
        .prepare(`SELECT * FROM games WHERE batch_id = ? ORDER BY created_at`)
        .all(batchId) as GameDbRow[]
    ).map(toGame);
  }

  setGameStatus(id: Id<"game">, status: GameStatus, reason?: string): void {
    const at = this.now();
    if (status === "running") {
      this.db.$sqlite
        .prepare(
          `UPDATE games SET status = ?, started_at = COALESCE(started_at, ?) WHERE id = ?`,
        )
        .run(status, at, id);
    } else if (status === "ended" || status === "terminated" || status === "failed") {
      this.db.$sqlite
        .prepare(
          `UPDATE games SET status = ?, ended_at = ?, ended_reason = ? WHERE id = ?`,
        )
        .run(status, at, reason ?? null, id);
    } else {
      this.db.$sqlite.prepare(`UPDATE games SET status = ? WHERE id = ?`).run(status, id);
    }
  }

  setGameCurrentStage(id: Id<"game">, stageId: Id<"stage"> | null): void {
    this.db.$sqlite
      .prepare(`UPDATE games SET current_stage_id = ? WHERE id = ?`)
      .run(stageId, id);
  }

  // ── rounds ─────────────────────────────────────────────────────────────

  createRound(input: { gameId: Id<"game">; name?: string }): RoundRow {
    const id = newId<"round">();
    const at = this.now();
    const idx = this.nextRoundIdx(input.gameId);
    this.db.$sqlite
      .prepare(
        `INSERT INTO rounds(id, game_id, idx, name, created_at) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(id, input.gameId, idx, input.name ?? null, at);
    return this.round(id)!;
  }

  round(id: Id<"round">): RoundRow | undefined {
    const r = this.db.$sqlite.prepare(`SELECT * FROM rounds WHERE id = ?`).get(id);
    return r ? toRound(r as RoundDbRow) : undefined;
  }

  roundsInGame(gameId: Id<"game">): RoundRow[] {
    return (
      this.db.$sqlite
        .prepare(`SELECT * FROM rounds WHERE game_id = ? ORDER BY idx`)
        .all(gameId) as RoundDbRow[]
    ).map(toRound);
  }

  private nextRoundIdx(gameId: Id<"game">): number {
    const row = this.db.$sqlite
      .prepare(`SELECT COALESCE(MAX(idx), -1) + 1 AS next FROM rounds WHERE game_id = ?`)
      .get(gameId) as { next: number };
    return row.next;
  }

  // ── stages ─────────────────────────────────────────────────────────────

  createStage(input: {
    gameId: Id<"game">;
    roundId?: Id<"round">;
    name?: string;
    kind?: "interactive" | "lobby";
    durationMs: number;
    lobbyConfig?: JsonObject;
  }): StageRow {
    if (input.durationMs <= 0 || !Number.isFinite(input.durationMs)) {
      throw new RangeError(`stage duration must be positive ms, got ${input.durationMs}`);
    }
    const id = newId<"stage">();
    const at = this.now();
    const idx = this.nextStageIdx(input.gameId, input.roundId ?? null);
    this.db.$sqlite
      .prepare(
        `INSERT INTO stages(id, game_id, round_id, idx, name, kind, duration_ms, lobby_config_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.gameId,
        input.roundId ?? null,
        idx,
        input.name ?? null,
        input.kind ?? "interactive",
        input.durationMs,
        input.lobbyConfig ? JSON.stringify(input.lobbyConfig) : null,
        at,
      );
    return this.stage(id)!;
  }

  stage(id: Id<"stage">): StageRow | undefined {
    const r = this.db.$sqlite.prepare(`SELECT * FROM stages WHERE id = ?`).get(id);
    return r ? toStage(r as StageDbRow) : undefined;
  }

  stagesInGame(gameId: Id<"game">): StageRow[] {
    return (
      this.db.$sqlite
        .prepare(`SELECT * FROM stages WHERE game_id = ? ORDER BY idx`)
        .all(gameId) as StageDbRow[]
    ).map(toStage);
  }

  setStageStarted(id: Id<"stage">, startedAt: number, endsAt: number): void {
    this.db.$sqlite
      .prepare(`UPDATE stages SET started_at = ?, ends_at = ? WHERE id = ?`)
      .run(startedAt, endsAt, id);
  }

  setStageEnded(id: Id<"stage">, endedAt: number): void {
    this.db.$sqlite
      .prepare(`UPDATE stages SET ended_at = ? WHERE id = ?`)
      .run(endedAt, id);
  }

  private nextStageIdx(gameId: Id<"game">, roundId: Id<"round"> | null): number {
    const row = this.db.$sqlite
      .prepare(
        `SELECT COALESCE(MAX(idx), -1) + 1 AS next FROM stages
         WHERE game_id = ? AND ${roundId === null ? "round_id IS NULL" : "round_id = ?"}`,
      )
      .get(...(roundId === null ? [gameId] : [gameId, roundId])) as { next: number };
    return row.next;
  }

  // ── players ────────────────────────────────────────────────────────────

  createPlayer(input: {
    batchId?: Id<"batch">;
    participantId?: Id<"participant">;
  }): PlayerRow {
    const id = newId<"player">();
    const at = this.now();
    this.db.$sqlite
      .prepare(
        `INSERT INTO players(id, batch_id, participant_id, status, created_at)
         VALUES (?, ?, ?, 'waiting', ?)`,
      )
      .run(id, input.batchId ?? null, input.participantId ?? null, at);
    return this.player(id)!;
  }

  player(id: Id<"player">): PlayerRow | undefined {
    const r = this.db.$sqlite.prepare(`SELECT * FROM players WHERE id = ?`).get(id);
    return r ? toPlayer(r as PlayerDbRow) : undefined;
  }

  playersInGame(gameId: Id<"game">): PlayerRow[] {
    return (
      this.db.$sqlite
        .prepare(`SELECT * FROM players WHERE game_id = ? ORDER BY created_at`)
        .all(gameId) as PlayerDbRow[]
    ).map(toPlayer);
  }

  playersInBatch(batchId: Id<"batch">): PlayerRow[] {
    return (
      this.db.$sqlite
        .prepare(`SELECT * FROM players WHERE batch_id = ? ORDER BY created_at`)
        .all(batchId) as PlayerDbRow[]
    ).map(toPlayer);
  }

  assignPlayerToGame(playerId: Id<"player">, gameId: Id<"game">): void {
    const game = this.game(gameId);
    if (!game) throw new Error(`assignPlayerToGame: no such game ${gameId}`);
    this.db.$sqlite
      .prepare(
        `UPDATE players SET game_id = ?, batch_id = ?, status = 'lobby', ended_reason = NULL, ended_at = NULL
         WHERE id = ?`,
      )
      .run(gameId, game.batchId, playerId);
  }

  setPlayerStatus(id: Id<"player">, status: PlayerStatus, reason?: string): void {
    const at = this.now();
    if (status === "ended" || status === "exited") {
      this.db.$sqlite
        .prepare(
          `UPDATE players SET status = ?, ended_at = ?, ended_reason = ? WHERE id = ?`,
        )
        .run(status, at, reason ?? null, id);
    } else {
      this.db.$sqlite
        .prepare(`UPDATE players SET status = ?, ended_reason = NULL, ended_at = NULL WHERE id = ?`)
        .run(status, id);
    }
  }

  // ── participants ───────────────────────────────────────────────────────

  upsertParticipant(input: {
    identifier: string;
    metadata?: JsonObject;
  }): ParticipantRow {
    const at = this.now();
    const existing = this.db.$sqlite
      .prepare(`SELECT * FROM participants WHERE identifier = ?`)
      .get(input.identifier) as ParticipantDbRow | undefined;
    if (existing) return toParticipant(existing);

    const id = newId<"participant">();
    this.db.$sqlite
      .prepare(
        `INSERT INTO participants(id, identifier, metadata, created_at) VALUES (?, ?, ?, ?)`,
      )
      .run(id, input.identifier, JSON.stringify(input.metadata ?? {}), at);
    return this.participant(id)!;
  }

  participant(id: Id<"participant">): ParticipantRow | undefined {
    const r = this.db.$sqlite
      .prepare(`SELECT * FROM participants WHERE id = ?`)
      .get(id);
    return r ? toParticipant(r as ParticipantDbRow) : undefined;
  }
}

// ── row mappers ─────────────────────────────────────────────────────────────

interface BatchDbRow {
  id: string;
  status: BatchStatus;
  config_json: string;
  lobby_config_json: string | null;
  name: string | null;
  created_at: number;
  started_at: number | null;
  ended_at: number | null;
  ended_reason: string | null;
}

interface GameDbRow {
  id: string;
  batch_id: string;
  treatment_json: string;
  treatment_name: string | null;
  status: GameStatus;
  current_stage_id: string | null;
  created_at: number;
  started_at: number | null;
  ended_at: number | null;
  ended_reason: string | null;
}

interface RoundDbRow {
  id: string;
  game_id: string;
  idx: number;
  name: string | null;
  started_at: number | null;
  ended_at: number | null;
  created_at: number;
}

interface StageDbRow {
  id: string;
  game_id: string;
  round_id: string | null;
  idx: number;
  name: string | null;
  kind: "interactive" | "lobby";
  duration_ms: number;
  started_at: number | null;
  ends_at: number | null;
  ended_at: number | null;
  lobby_config_json: string | null;
  created_at: number;
}

interface PlayerDbRow {
  id: string;
  game_id: string | null;
  batch_id: string | null;
  participant_id: string | null;
  status: PlayerStatus;
  ended_reason: string | null;
  created_at: number;
  ended_at: number | null;
}

interface ParticipantDbRow {
  id: string;
  identifier: string;
  metadata: string;
  created_at: number;
}

function toBatch(r: BatchDbRow): BatchRow {
  return {
    id: r.id as Id<"batch">,
    status: r.status,
    config: JSON.parse(r.config_json) as JsonObject,
    lobbyConfig: r.lobby_config_json
      ? (JSON.parse(r.lobby_config_json) as JsonObject)
      : null,
    name: r.name,
    createdAt: r.created_at,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    endedReason: r.ended_reason,
  };
}

function toGame(r: GameDbRow): GameRow {
  return {
    id: r.id as Id<"game">,
    batchId: r.batch_id as Id<"batch">,
    treatment: JSON.parse(r.treatment_json) as JsonObject,
    treatmentName: r.treatment_name,
    status: r.status,
    currentStageId: r.current_stage_id as Id<"stage"> | null,
    createdAt: r.created_at,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    endedReason: r.ended_reason,
  };
}

function toRound(r: RoundDbRow): RoundRow {
  return {
    id: r.id as Id<"round">,
    gameId: r.game_id as Id<"game">,
    idx: r.idx,
    name: r.name,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    createdAt: r.created_at,
  };
}

function toStage(r: StageDbRow): StageRow {
  return {
    id: r.id as Id<"stage">,
    gameId: r.game_id as Id<"game">,
    roundId: r.round_id as Id<"round"> | null,
    idx: r.idx,
    name: r.name,
    kind: r.kind,
    durationMs: r.duration_ms,
    startedAt: r.started_at,
    endsAt: r.ends_at,
    endedAt: r.ended_at,
    lobbyConfig: r.lobby_config_json
      ? (JSON.parse(r.lobby_config_json) as JsonObject)
      : null,
    createdAt: r.created_at,
  };
}

function toPlayer(r: PlayerDbRow): PlayerRow {
  return {
    id: r.id as Id<"player">,
    gameId: r.game_id as Id<"game"> | null,
    batchId: r.batch_id as Id<"batch"> | null,
    participantId: r.participant_id as Id<"participant"> | null,
    status: r.status,
    endedReason: r.ended_reason,
    createdAt: r.created_at,
    endedAt: r.ended_at,
  };
}

function toParticipant(r: ParticipantDbRow): ParticipantRow {
  return {
    id: r.id as Id<"participant">,
    identifier: r.identifier,
    metadata: JSON.parse(r.metadata) as JsonObject,
    createdAt: r.created_at,
  };
}

// Re-export for the runtime to consume.
export type { Id, Json };
