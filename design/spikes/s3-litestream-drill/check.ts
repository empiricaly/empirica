// S3 spike: inspect a (restored) DB — prints max(counter), row count,
// contiguity, and integrity_check result as a single JSON line.
//
// Usage: bun check.ts <db-path>

import { Database } from "bun:sqlite";

const dbPath = process.argv[2];
const db = new Database(dbPath, { readonly: true });

const row = db
  .query("SELECT max(counter) AS maxc, count(*) AS n FROM events")
  .get() as { maxc: number | null; n: number };
const integrity = db.query("PRAGMA integrity_check").get() as {
  integrity_check: string;
};

console.log(
  JSON.stringify({
    db: dbPath,
    max_counter: row.maxc,
    rows: row.n,
    contiguous: row.maxc === row.n, // counter starts at 1, so max==count => no holes
    integrity: integrity.integrity_check,
  })
);
