import Database from "better-sqlite3";
import type { Database as BetterSqlite } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { applyMigrations } from "./migrations.js";

export type Db = BetterSQLite3Database<typeof schema> & {
  $sqlite: BetterSqlite;
};

export interface OpenDbOptions {
  /** File path. Use `":memory:"` for an in-memory DB (tests). */
  path: string;
  /** Run migrations on open. Default true. */
  migrate?: boolean;
  /** WAL mode for file DBs. Default true (ignored for `:memory:`). */
  wal?: boolean;
}

/**
 * Open (and migrate) a SQLite database. Returns a Drizzle handle with the
 * raw better-sqlite3 instance attached for low-level access.
 */
export function openDb(opts: OpenDbOptions): Db {
  const sqlite = new Database(opts.path);

  // Pragmas. Order matters: foreign_keys MUST be set per-connection.
  sqlite.pragma("foreign_keys = ON");
  if (opts.path !== ":memory:" && opts.wal !== false) {
    sqlite.pragma("journal_mode = WAL");
  }
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("busy_timeout = 5000");

  if (opts.migrate !== false) {
    applyMigrations(sqlite);
  }

  const drz = drizzle(sqlite, { schema }) as unknown as Db;
  drz.$sqlite = sqlite;
  return drz;
}

/** Convenience for tests: a fresh in-memory db, migrated. */
export function openMemoryDb(): Db {
  return openDb({ path: ":memory:" });
}
