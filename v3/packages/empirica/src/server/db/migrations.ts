import type { Database } from "better-sqlite3";

// Migration strategy
//
// We don't use drizzle-kit's runtime migrator because it expects generated
// SQL on disk. We're shipping migrations inline in the runtime so the npm
// package is fully self-contained (no separate "run migrations" step for
// users).
//
// Each migration is a numbered SQL string. Applied in order; idempotent via
// the `schema_meta` table. To add a migration, append to MIGRATIONS — never
// edit a previously-shipped one.

export interface Migration {
  /** 1-based sequence; must increase strictly. */
  version: number;
  /** Human label; appears in logs and `schema_meta`. */
  label: string;
  /** SQL statements; executed in a single transaction. */
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    label: "initial",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY NOT NULL,
        identifier TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS participants_identifier_uq
        ON participants(identifier);

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY NOT NULL,
        subject TEXT NOT NULL,
        issuer TEXT NOT NULL,
        display_name TEXT,
        email TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        last_seen_at INTEGER
      );
      CREATE UNIQUE INDEX IF NOT EXISTS admins_issuer_subject_uq
        ON admins(issuer, subject);

      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL DEFAULT 'created',
        config_json TEXT NOT NULL,
        lobby_config_json TEXT,
        name TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        started_at INTEGER,
        ended_at INTEGER,
        ended_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY NOT NULL,
        batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        treatment_json TEXT NOT NULL,
        treatment_name TEXT,
        status TEXT NOT NULL DEFAULT 'created',
        current_stage_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        started_at INTEGER,
        ended_at INTEGER,
        ended_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS games_batch_idx ON games(batch_id);
      CREATE INDEX IF NOT EXISTS games_status_idx ON games(status);

      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY NOT NULL,
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        idx INTEGER NOT NULL,
        name TEXT,
        started_at INTEGER,
        ended_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );
      CREATE INDEX IF NOT EXISTS rounds_game_idx ON rounds(game_id, idx);
      CREATE UNIQUE INDEX IF NOT EXISTS rounds_game_idx_uq ON rounds(game_id, idx);

      CREATE TABLE IF NOT EXISTS stages (
        id TEXT PRIMARY KEY NOT NULL,
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        round_id TEXT REFERENCES rounds(id) ON DELETE CASCADE,
        idx INTEGER NOT NULL,
        name TEXT,
        kind TEXT NOT NULL DEFAULT 'interactive',
        duration_ms INTEGER NOT NULL,
        started_at INTEGER,
        ends_at INTEGER,
        ended_at INTEGER,
        lobby_config_json TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );
      CREATE INDEX IF NOT EXISTS stages_game_idx ON stages(game_id);
      CREATE INDEX IF NOT EXISTS stages_round_idx ON stages(round_id);

      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY NOT NULL,
        game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
        batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
        participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        ended_reason TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        ended_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS players_game_idx ON players(game_id);
      CREATE INDEX IF NOT EXISTS players_batch_idx ON players(batch_id);
      CREATE INDEX IF NOT EXISTS players_participant_idx ON players(participant_id);

      CREATE TABLE IF NOT EXISTS state (
        scope_kind TEXT NOT NULL,
        scope_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value_json TEXT NOT NULL,
        flags INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        PRIMARY KEY (scope_kind, scope_id, key)
      );
      CREATE INDEX IF NOT EXISTS state_scope_idx ON state(scope_kind, scope_id);

      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        op TEXT NOT NULL,
        scope_kind TEXT NOT NULL,
        scope_id TEXT NOT NULL,
        key TEXT,
        value_json TEXT,
        by TEXT,
        at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_scope_idx
        ON events(scope_kind, scope_id, seq);
      CREATE INDEX IF NOT EXISTS events_time_idx ON events(at);

      CREATE TABLE IF NOT EXISTS globals (
        key TEXT PRIMARY KEY NOT NULL,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE TABLE IF NOT EXISTS treatments (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        factors_json TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        archived_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS treatments_name_version_uq
        ON treatments(name, version);
    `,
  },
];

const META_KEY = "schema_version";

export function applyMigrations(db: Database): { applied: number[]; current: number } {
  ensureMetaTable(db);

  const current = currentVersion(db);
  const applied: number[] = [];

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;

    const tx = db.transaction(() => {
      db.exec(m.sql);
      db.prepare(
        `INSERT INTO schema_meta(key, value) VALUES('${META_KEY}', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      ).run(String(m.version));
    });
    tx();
    applied.push(m.version);
  }

  return { applied, current: currentVersion(db) };
}

function ensureMetaTable(db: Database): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  );
}

function currentVersion(db: Database): number {
  const row = db
    .prepare("SELECT value FROM schema_meta WHERE key = ?")
    .get(META_KEY) as { value: string } | undefined;
  return row ? Number(row.value) : 0;
}
