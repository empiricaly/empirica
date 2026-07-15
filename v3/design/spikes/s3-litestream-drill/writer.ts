// S3 spike: continuous-write workload for the litestream crash drill.
//
// Usage: bun writer.ts <db-path> <committed-log-path>
//
// - Opens (creates) a SQLite DB in WAL mode.
// - ~50 txns/sec: each txn inserts one row with a monotonically increasing counter.
// - AFTER each successful COMMIT, appends the counter to a plain log file and
//   fsyncs it. That log is the ground truth of committed transactions: any
//   counter present in the log was durably committed before the crash.
// - synchronous=FULL so "committed" means fsynced WAL, removing any ambiguity
//   about what the SQLite side had durably committed (kill -9 would not lose
//   OS-buffered writes anyway, but FULL makes the claim airtight).

import { Database } from "bun:sqlite";
import fs from "node:fs";

const dbPath = process.argv[2];
const logPath = process.argv[3];
if (!dbPath || !logPath) {
  console.error("usage: bun writer.ts <db-path> <committed-log-path>");
  process.exit(1);
}

const db = new Database(dbPath, { create: true });
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA synchronous=FULL;");
db.exec("PRAGMA busy_timeout=5000;");
db.exec(
  "CREATE TABLE IF NOT EXISTS events (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "counter INTEGER NOT NULL UNIQUE, " +
    "ts_ms INTEGER NOT NULL, " +
    "payload TEXT NOT NULL)"
);

const insert = db.prepare(
  "INSERT INTO events (counter, ts_ms, payload) VALUES (?, ?, ?)"
);

const fd = fs.openSync(logPath, "a");
let counter = 0;

// 20ms interval ~= 50 txn/sec.
setInterval(() => {
  counter++;
  // Implicit transaction per statement: prepare/run is a single-statement txn,
  // COMMIT happens inside run().
  insert.run(counter, Date.now(), `payload-${counter}`);
  // Ground truth: only logged AFTER the commit returned.
  fs.writeSync(fd, `${counter} ${Date.now()}\n`);
  fs.fsyncSync(fd);
}, 20);

console.log(`writer pid=${process.pid} db=${dbPath} log=${logPath}`);
