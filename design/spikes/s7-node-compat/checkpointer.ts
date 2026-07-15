// S7: Node port of S1's checkpointer.ts — passive WAL checkpointer on a
// worker_threads Worker with its OWN better-sqlite3 connection.
// PRAGMA wal_checkpoint(PASSIVE) copies WAL pages into the main db without
// blocking the writer. Every 10th tick runs RESTART: under continuous writes
// PASSIVE alone never yields a WAL restart point and the WAL grows without
// bound (S1 measured 1.5GB in 2min at 1000 cmd/s); RESTART briefly takes the
// write lock to reset the WAL write position — the writer rides it out via
// busy_timeout. (Bun version used the web Worker API: self.onmessage/postMessage.)
import { parentPort } from "node:worker_threads";
import Database from "better-sqlite3";

parentPort!.on("message", (msg: { path: string; intervalMs: number }) => {
  const { path, intervalMs } = msg;
  const db = new Database(path);
  db.exec("PRAGMA busy_timeout = 5000");
  let tick = 0;
  setInterval(() => {
    const mode = ++tick % 10 === 0 ? "RESTART" : "PASSIVE";
    const t0 = performance.now();
    // -> { busy: 0|1, log: frames in WAL, checkpointed: frames copied }
    // db.pragma() (better-sqlite3's pragma API; bun:sqlite uses db.query("PRAGMA ...").get())
    const r = (db.pragma(`wal_checkpoint(${mode})`) as Record<string, number>[])[0];
    parentPort!.postMessage({ ...r, mode, ms: +(performance.now() - t0).toFixed(1) });
  }, intervalMs);
});
