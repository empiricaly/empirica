import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

// Schema notes
//
// Times are stored as INTEGER epoch milliseconds. Trivially sortable, no
// timezone games, fits a JS number.
//
// JSON columns are stored as TEXT and accessed with JSON.parse/stringify at
// the read/write boundary. SQLite has JSON1, but our reads always go through
// the runtime, which deserialises. Keeping it as TEXT lets us swap in a
// non-SQLite backend later without changing column types.
//
// All ids are nanoid strings (see shared/id.ts).

const id = (name = "id") => text(name).notNull();
const createdAt = () =>
  integer("created_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
const updatedAt = () =>
  integer("updated_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

// ─────────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────────

export const participants = sqliteTable(
  "participants",
  {
    id: id().primaryKey(),
    /**
     * Researcher-supplied stable identifier (e.g., Prolific ID, MTurk worker
     * ID, internal study ID). Unique per server, opaque to the runtime.
     */
    identifier: text("identifier").notNull(),
    /** Arbitrary metadata captured at create time (JSON). */
    metadata: text("metadata").notNull().default("{}"),
    createdAt: createdAt(),
  },
  (t) => ({
    identifierUq: unique("participants_identifier_uq").on(t.identifier),
  }),
);

export const admins = sqliteTable(
  "admins",
  {
    id: id().primaryKey(),
    /**
     * The `sub` claim from the verified JWT (or a synthetic one for the dev
     * provider). Globally unique across providers via `${issuer}|${sub}`.
     */
    subject: text("subject").notNull(),
    issuer: text("issuer").notNull(),
    displayName: text("display_name"),
    email: text("email"),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: createdAt(),
    lastSeenAt: integer("last_seen_at", { mode: "number" }),
  },
  (t) => ({
    subjectUq: unique("admins_issuer_subject_uq").on(t.issuer, t.subject),
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Experiment structure
// ─────────────────────────────────────────────────────────────────────────────

export const batches = sqliteTable("batches", {
  id: id().primaryKey(),
  /** "created" | "running" | "ended" | "terminated" | "failed". */
  status: text("status").notNull().default("created"),
  /**
   * The batch creation config (zod-validated at the API boundary). Includes
   * which treatments to use and how many games of each. Frozen here.
   */
  configJson: text("config_json").notNull(),
  /**
   * Lobby config snapshot at batch creation time. Null when no lobby is in
   * use (e.g., the solo template).
   */
  lobbyConfigJson: text("lobby_config_json"),
  /** Optional human label for the admin UI. */
  name: text("name"),
  createdAt: createdAt(),
  startedAt: integer("started_at", { mode: "number" }),
  endedAt: integer("ended_at", { mode: "number" }),
  endedReason: text("ended_reason"),
});

export const games = sqliteTable(
  "games",
  {
    id: id().primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    /**
     * The exact treatment factors this game runs. Deep-copied from the source
     * treatment at create time. Editing the source treatment never mutates
     * this column. Validated against the user-supplied factor schema.
     */
    treatmentJson: text("treatment_json").notNull(),
    treatmentName: text("treatment_name"),
    /** "created" | "lobby" | "running" | "ended" | "terminated" | "failed". */
    status: text("status").notNull().default("created"),
    currentStageId: text("current_stage_id"),
    createdAt: createdAt(),
    startedAt: integer("started_at", { mode: "number" }),
    endedAt: integer("ended_at", { mode: "number" }),
    endedReason: text("ended_reason"),
  },
  (t) => ({
    batchIdx: index("games_batch_idx").on(t.batchId),
    statusIdx: index("games_status_idx").on(t.status),
  }),
);

export const rounds = sqliteTable(
  "rounds",
  {
    id: id().primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    name: text("name"),
    startedAt: integer("started_at", { mode: "number" }),
    endedAt: integer("ended_at", { mode: "number" }),
    createdAt: createdAt(),
  },
  (t) => ({
    gameIdx: index("rounds_game_idx").on(t.gameId, t.idx),
    gameIdxUq: unique("rounds_game_idx_uq").on(t.gameId, t.idx),
  }),
);

export const stages = sqliteTable(
  "stages",
  {
    id: id().primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    /** Optional: a stage may live directly under a game with no round. */
    roundId: text("round_id").references(() => rounds.id, { onDelete: "cascade" }),
    /** Index within the parent (round if present, else game). */
    idx: integer("idx").notNull(),
    name: text("name"),
    /** "interactive" | "lobby". */
    kind: text("kind").notNull().default("interactive"),
    durationMs: integer("duration_ms").notNull(),
    startedAt: integer("started_at", { mode: "number" }),
    endsAt: integer("ends_at", { mode: "number" }),
    endedAt: integer("ended_at", { mode: "number" }),
    /** Frozen lobby config for a kind:"lobby" stage. */
    lobbyConfigJson: text("lobby_config_json"),
    createdAt: createdAt(),
  },
  (t) => ({
    gameIdx: index("stages_game_idx").on(t.gameId),
    roundIdx: index("stages_round_idx").on(t.roundId),
  }),
);

export const players = sqliteTable(
  "players",
  {
    id: id().primaryKey(),
    /** A player may exist before being assigned to a game (lobby waiting). */
    gameId: text("game_id").references(() => games.id, { onDelete: "set null" }),
    batchId: text("batch_id").references(() => batches.id, { onDelete: "set null" }),
    /** Cross-batch identity (optional). */
    participantId: text("participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    /** "waiting" | "lobby" | "playing" | "ended" | "exited". */
    status: text("status").notNull().default("waiting"),
    /**
     * Exit/end reason. Mirrors the v2 `ended` attribute but captured as a
     * structural column so we can index/filter on it.
     */
    endedReason: text("ended_reason"),
    createdAt: createdAt(),
    endedAt: integer("ended_at", { mode: "number" }),
  },
  (t) => ({
    gameIdx: index("players_game_idx").on(t.gameId),
    batchIdx: index("players_batch_idx").on(t.batchId),
    participantIdx: index("players_participant_idx").on(t.participantId),
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// State + events
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic key-value storage scoped to (kind, scopeId).
 *
 * Replaces v2's "attributes." Reads and writes go through the runtime's
 * synchronous tx machinery. Any read after a write inside the same tx sees
 * the new value.
 */
export const state = sqliteTable(
  "state",
  {
    scopeKind: text("scope_kind").notNull(),
    scopeId: text("scope_id").notNull(),
    key: text("key").notNull(),
    valueJson: text("value_json").notNull(),
    /**
     * Bitfield: 1 = immutable (set once, errors thereafter); 2 = private (not
     * surfaced to non-admin subscribers); 4 = protected (only the runtime may
     * write). Bitfield rather than columns to keep this hot table narrow.
     */
    flags: integer("flags").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scopeKind, t.scopeId, t.key] }),
    scopeIdx: index("state_scope_idx").on(t.scopeKind, t.scopeId),
  }),
);

/**
 * Append-only log of every state mutation. Source of truth for replay,
 * history, and export. `seq` is a monotonically increasing per-server
 * sequence (a SQLite autoincrement primary key).
 *
 * `op` is one of:
 *   - "set"     value_json = new value
 *   - "delete"  value_json = null
 *   - "scope"   create/end of a scope (value_json describes the scope)
 *   - "link"    a relationship event (subscription helpers)
 *   - "log"     a structured runtime log entry routed to subscribers
 */
export const events = sqliteTable(
  "events",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    op: text("op").notNull(),
    scopeKind: text("scope_kind").notNull(),
    scopeId: text("scope_id").notNull(),
    key: text("key"),
    valueJson: text("value_json"),
    by: text("by"),
    at: integer("at", { mode: "number" }).notNull(),
  },
  (t) => ({
    scopeIdx: index("events_scope_idx").on(t.scopeKind, t.scopeId, t.seq),
    timeIdx: index("events_time_idx").on(t.at),
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Globals
// ─────────────────────────────────────────────────────────────────────────────

export const globals = sqliteTable("globals", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Treatments (server-managed; runtime-editable from the admin UI)
// ─────────────────────────────────────────────────────────────────────────────

export const treatments = sqliteTable(
  "treatments",
  {
    id: id().primaryKey(),
    name: text("name").notNull(),
    factorsJson: text("factors_json").notNull(),
    /** When edits happen, prior versions stay queryable. */
    version: integer("version").notNull().default(1),
    /** Tombstones rather than deletes so older games can resolve their source. */
    archivedAt: integer("archived_at", { mode: "number" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    nameVersionUq: unique("treatments_name_version_uq").on(t.name, t.version),
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Schema version (migrations metadata)
// ─────────────────────────────────────────────────────────────────────────────

export const schemaMeta = sqliteTable("schema_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
