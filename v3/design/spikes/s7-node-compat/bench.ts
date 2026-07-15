// S7: Node port of S1's bench.ts — pure command-loop txn throughput, no WebSockets.
// Same per-command work as server.ts: SELECT old kv, upsert kv, insert event, insert change.
// Same six modes as S1: one-txn-per-command vs 25-commands-per-txn; synchronous
// NORMAL vs FULL; BEGIN vs BEGIN IMMEDIATE; prepared-statement reuse vs re-prepare.
// Same methodology: 0.5s warmup, 4s measured per mode, performance.now() clock.

import { rmSync } from "node:fs";
import { openDatabase } from "./platform-node.ts";
import type { SqliteDriver, SqliteStmt } from "./seam.ts";

const DIR = `${import.meta.dirname}/data`;

function openDb(name: string, sync: string): SqliteDriver {
  const path = `${DIR}/bench-${name}.db`;
  rmSync(path, { force: true });
  rmSync(`${path}-wal`, { force: true });
  rmSync(`${path}-shm`, { force: true });
  const db = openDatabase(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`PRAGMA synchronous = ${sync}`);
  db.exec(`
    CREATE TABLE kv (entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, key TEXT NOT NULL,
      value TEXT NOT NULL, updated_seq INTEGER NOT NULL, PRIMARY KEY (entity_type, entity_id, key));
    CREATE TABLE events (seq INTEGER PRIMARY KEY, ts INTEGER NOT NULL, actor TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE changes (seq INTEGER NOT NULL, entity TEXT NOT NULL, key TEXT NOT NULL, old TEXT, new TEXT NOT NULL);
  `);
  return db;
}

function stmts(db: SqliteDriver) {
  return {
    old: db.prepare<{ value: string }>(
      "SELECT value FROM kv WHERE entity_type=? AND entity_id=? AND key=?"),
    upsert: db.prepare(`INSERT INTO kv (entity_type, entity_id, key, value, updated_seq) VALUES (?,?,?,?,?)
      ON CONFLICT(entity_type, entity_id, key) DO UPDATE SET value=excluded.value, updated_seq=excluded.updated_seq`),
    event: db.prepare("INSERT INTO events (seq, ts, actor, payload) VALUES (?,?,?,?)"),
    change: db.prepare("INSERT INTO changes (seq, entity, key, old, new) VALUES (?,?,?,?,?)"),
  };
}

function oneCommand(s: ReturnType<typeof stmts>, seq: number) {
  const ent = `p${seq % 1000}`, key = `k${seq % 4}`, val = String(seq);
  const old = s.old.get("player", ent, key);
  s.upsert.run("player", ent, key, val, seq);
  s.event.run(seq, Date.now(), ent, `{"t":"cmd","cid":${seq},"key":"${key}","value":${seq}}`);
  s.change.run(seq, `player/${ent}`, key, old?.value ?? null, val);
}

// run fn(seq) repeatedly for `seconds`, fn returns commands executed per call
function measure(name: string, fn: (seq: number) => number, seconds = 4) {
  let seq = 0;
  const warmEnd = performance.now() + 500;
  while (performance.now() < warmEnd) seq += fn(seq);
  let n = 0;
  const t0 = performance.now();
  const tEnd = t0 + seconds * 1000;
  while (performance.now() < tEnd) n += fn(seq + n);
  const cps = n / ((performance.now() - t0) / 1000);
  console.log(`${name.padEnd(52)} ${Math.round(cps).toLocaleString().padStart(10)} cmds/sec`);
  return Math.round(cps);
}

const results: Record<string, number> = {};

for (const sync of ["NORMAL", "FULL"]) {
  {
    const db = openDb(`percmd-${sync}`, sync);
    const s = stmts(db);
    const tx = db.transaction((seq: number) => oneCommand(s, seq));
    results[`per-command txn, BEGIN IMMEDIATE, sync=${sync}`] =
      measure(`per-command txn, BEGIN IMMEDIATE, sync=${sync}`, (q) => { tx.immediate(q); return 1; });
    db.close();
  }
  {
    const db = openDb(`batch25-${sync}`, sync);
    const s = stmts(db);
    const tx = db.transaction((seq: number) => { for (let i = 0; i < 25; i++) oneCommand(s, seq + i); });
    results[`batched 25/txn, BEGIN IMMEDIATE, sync=${sync}`] =
      measure(`batched 25/txn, BEGIN IMMEDIATE, sync=${sync}`, (q) => { tx.immediate(q); return 25; });
    db.close();
  }
}

{ // deferred BEGIN (default transaction call) vs IMMEDIATE, NORMAL
  const db = openDb("percmd-deferred", "NORMAL");
  const s = stmts(db);
  const tx = db.transaction((seq: number) => oneCommand(s, seq));
  results["per-command txn, BEGIN (deferred), sync=NORMAL"] =
    measure("per-command txn, BEGIN (deferred), sync=NORMAL", (q) => { tx(q); return 1; });
  db.close();
}

{ // re-prepare all 4 statements on every command (no reuse), NORMAL, per-command txn
  const db = openDb("percmd-reprepare", "NORMAL");
  const tx = db.transaction((seq: number) => {
    const ent = `p${seq % 1000}`, key = `k${seq % 4}`, val = String(seq);
    const old = db.prepare<{ value: string }>("SELECT value FROM kv WHERE entity_type=? AND entity_id=? AND key=?")
      .get("player", ent, key);
    db.prepare(`INSERT INTO kv (entity_type, entity_id, key, value, updated_seq) VALUES (?,?,?,?,?)
      ON CONFLICT(entity_type, entity_id, key) DO UPDATE SET value=excluded.value, updated_seq=excluded.updated_seq`)
      .run("player", ent, key, val, seq);
    db.prepare("INSERT INTO events (seq, ts, actor, payload) VALUES (?,?,?,?)").run(seq, Date.now(), ent, "{}");
    db.prepare("INSERT INTO changes (seq, entity, key, old, new) VALUES (?,?,?,?,?)")
      .run(seq, `player/${ent}`, key, old?.value ?? null, val);
  });
  results["per-command txn, re-prepare stmts each cmd, NORMAL"] =
    measure("per-command txn, re-prepare stmts each cmd, NORMAL", (q) => { tx.immediate(q); return 1; });
  db.close();
}

console.log("\nJSON: " + JSON.stringify(results));
