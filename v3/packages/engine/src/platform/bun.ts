// Bun implementation of the SqliteDriver seam (from spike S1; mandatory PRAGMA
// discipline lives in the engine boot code, not here — design/05-storage.md).
// The WsServer seam implementation lands with @empirica/server.
import { Database } from "bun:sqlite";
import type { SqliteDriver, SqliteStmt, SqliteTxn } from "./seam.ts";

export function openBunSqlite(path: string): SqliteDriver {
  const db = new Database(path);
  return {
    exec: (sql) => db.exec(sql),
    prepare: <Row = unknown>(sql: string) => db.prepare(sql) as unknown as SqliteStmt<Row>,
    transaction: <Args extends unknown[], R>(fn: (...args: Args) => R) =>
      db.transaction(fn) as unknown as SqliteTxn<Args, R>,
    close: () => db.close(),
  };
}
