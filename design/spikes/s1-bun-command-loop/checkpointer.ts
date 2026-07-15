// Passive WAL checkpointer, run on a Worker thread with its OWN DB connection.
// PRAGMA wal_checkpoint(PASSIVE) copies WAL pages into the main db without
// blocking the writer, so the copy+fsync cost never lands on the command loop.
// Used by server.ts when CHECKPOINT_MODE=worker (writer sets wal_autocheckpoint=0).
import { Database } from "bun:sqlite";

declare var self: Worker;

// Surprise found in this spike: under continuous writes, PASSIVE alone never
// yields a WAL restart point, so the WAL grows without bound (1.5GB in 2min at
// 1000 cmd/s). Fix: every 10th tick run RESTART, which briefly takes the write
// lock to reset the WAL write position (file stays at high-water-mark size but
// stops growing); the writer rides it out via busy_timeout. TRUNCATE also works
// but its file-shrink+fsync held the lock ~80-110ms vs RESTART's ~room-tone.
self.onmessage = (e: MessageEvent) => {
  const { path, intervalMs } = e.data as { path: string; intervalMs: number };
  const db = new Database(path);
  db.exec("PRAGMA busy_timeout = 5000");
  let tick = 0;
  setInterval(() => {
    const mode = ++tick % 10 === 0 ? "RESTART" : "PASSIVE";
    const t0 = performance.now();
    // -> { busy: 0|1, log: frames in WAL, checkpointed: frames copied }
    const r = db.query(`PRAGMA wal_checkpoint(${mode})`).get() as any;
    postMessage({ ...r, mode, ms: +(performance.now() - t0).toFixed(1) });
  }, intervalMs);
};
