// S3 spike: verify a (restored) DB. Prints JSON:
//   { maxCounter, rows, contiguous, integrity, maxTs }
// contiguous == true means counters 1..maxCounter all present (no holes), i.e.
// the restored prefix is exactly the first N committed transactions.
//
// Usage: bun verify.ts <db-path>

import { Database } from "bun:sqlite";

const dbPath = Bun.argv[2];
if (!dbPath) {
  console.error("usage: bun verify.ts <db-path>");
  process.exit(2);
}

const db = new Database(dbPath, { readonly: true });
const agg = db
  .query("SELECT COALESCE(MAX(counter),0) AS maxCounter, COUNT(*) AS rows, COALESCE(MAX(ts),'') AS maxTs FROM events")
  .get() as { maxCounter: number; rows: number; maxTs: string };
const integrity = (db.query("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check;

console.log(
  JSON.stringify({
    maxCounter: agg.maxCounter,
    rows: agg.rows,
    contiguous: agg.rows === agg.maxCounter,
    integrity,
    maxTs: agg.maxTs,
  })
);
