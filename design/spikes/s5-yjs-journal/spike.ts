/**
 * Spike S5 — Yjs collab fields over an opaque journal (Empirica v3)
 *
 * Model under test:
 *   - Server treats Yjs update blobs as OPAQUE. It appends each blob to
 *     sqlite `collab_updates(seq INTEGER PRIMARY KEY, blob BLOB)` (journal-
 *     before-relay) and relays it to every other client. It never parses them.
 *   - Two in-memory clients edit one shared Y.Text concurrently, including
 *     same-position conflicts, deletes, and an offline period synced back via
 *     Y.encodeStateVector + diff updates.
 *
 * Proves/measures: REPLAY, SCRUB (keystroke-level), COMPACTION
 * (snapshot + tail), commutativity under arbitrary reorder (shuffle tests),
 * plus a Y.Map (whiteboard) variant. Prints all metrics for the README.
 *
 * Run: bun run spike.ts
 */

import * as Y from "yjs";
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

// ---------------------------------------------------------------- utilities

let failures = 0;
function check(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  PASS  ${msg}`);
  } else {
    failures++;
    console.log(`  FAIL  ${msg}`);
  }
}

// Seeded RNG (mulberry32) for reproducibility.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Decode a Yjs state vector (lib0 encoding: varUint count, then
// varUint(client), varUint(clock) pairs) so we can verify scrub monotonicity.
function decodeStateVector(sv: Uint8Array): Map<number, number> {
  let pos = 0;
  const readVarUint = () => {
    let num = 0;
    let mult = 1;
    while (true) {
      const b = sv[pos++];
      num += (b & 0x7f) * mult;
      if (b < 0x80) return num;
      mult *= 128;
    }
  };
  const map = new Map<number, number>();
  const len = readVarUint();
  for (let i = 0; i < len; i++) {
    const client = readVarUint();
    const clock = readVarUint();
    map.set(client, clock);
  }
  return map;
}

function svDominates(later: Map<number, number>, earlier: Map<number, number>): boolean {
  for (const [client, clock] of earlier) {
    if ((later.get(client) ?? 0) < clock) return false;
  }
  return true;
}

function hasPending(doc: Y.Doc): boolean {
  const store = doc.store as any;
  return store.pendingStructs !== null || store.pendingDs !== null;
}

// JSON.stringify is insertion-order sensitive; canonicalize for map compares.
function canonical(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(",")}]`;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(",")}}`;
}

function preview(s: string, n = 72): string {
  const flat = s.replace(/\n/g, "\\n");
  return flat.length <= n ? flat : flat.slice(0, n) + "…";
}

function stats(sizes: number[]) {
  const sorted = sizes.slice().sort((x, y) => x - y);
  const total = sizes.reduce((a, b) => a + b, 0);
  return {
    n: sizes.length,
    total,
    avg: total / sizes.length,
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

// ------------------------------------------------------------ server/client

/**
 * The "server": appends every received update blob to sqlite and relays it to
 * the other clients. It NEVER inspects blob contents. `pause()`/`flush()`
 * simulate network latency so that clients can produce genuinely concurrent
 * edits (neither sees the other's changes until flush).
 */
class Server {
  db: Database;
  clients: Client[] = [];
  paused = false;
  private queue: { from: Client; blob: Uint8Array }[] = [];
  private ins;
  /** in-memory mirror of every journaled blob, for shuffle experiments */
  allBlobs: Uint8Array[] = [];

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    // AUTOINCREMENT so seq values are never reused after compaction DELETEs.
    this.db.run(
      "CREATE TABLE collab_updates (seq INTEGER PRIMARY KEY AUTOINCREMENT, blob BLOB NOT NULL)"
    );
    this.db.run(
      "CREATE TABLE collab_snapshots (id INTEGER PRIMARY KEY CHECK (id = 1), upto_seq INTEGER NOT NULL, blob BLOB NOT NULL)"
    );
    this.ins = this.db.prepare("INSERT INTO collab_updates (blob) VALUES (?)");
  }

  receiveUpdate(from: Client, blob: Uint8Array) {
    if (this.paused) {
      this.queue.push({ from, blob }); // "in flight" on the network
      return;
    }
    this.commit(from, blob);
  }

  private commit(from: Client, blob: Uint8Array) {
    this.ins.run(blob); // 1. journal (arrival order)
    this.allBlobs.push(blob);
    for (const c of this.clients) if (c !== from) c.deliver(blob); // 2. relay
  }

  pause() {
    this.paused = true;
  }

  flush() {
    this.paused = false;
    const q = this.queue;
    this.queue = [];
    for (const m of q) this.commit(m.from, m.blob);
  }

  rows(uptoSeq?: number): { seq: number; blob: Uint8Array }[] {
    const sql =
      uptoSeq === undefined
        ? "SELECT seq, blob FROM collab_updates ORDER BY seq"
        : "SELECT seq, blob FROM collab_updates WHERE seq <= ? ORDER BY seq";
    const stmt = this.db.prepare(sql);
    return (uptoSeq === undefined ? stmt.all() : stmt.all(uptoSeq)) as any;
  }

  journalStats(): { count: number; bytes: number; maxSeq: number } {
    const r = this.db
      .prepare(
        "SELECT COUNT(*) c, COALESCE(SUM(LENGTH(blob)),0) b, COALESCE(MAX(seq),0) m FROM collab_updates"
      )
      .get() as any;
    return { count: r.c, bytes: r.b, maxSeq: r.m };
  }

  /** Compaction: store snapshot at `uptoSeq`, delete journal rows <= uptoSeq. */
  compact(uptoSeq: number, snapshot: Uint8Array) {
    this.db
      .prepare("INSERT OR REPLACE INTO collab_snapshots (id, upto_seq, blob) VALUES (1, ?, ?)")
      .run(uptoSeq, snapshot);
    this.db.prepare("DELETE FROM collab_updates WHERE seq <= ?").run(uptoSeq);
  }

  snapshot(): { upto_seq: number; blob: Uint8Array } | null {
    return this.db
      .prepare("SELECT upto_seq, blob FROM collab_snapshots WHERE id = 1")
      .get() as any;
  }
}

class Client {
  doc = new Y.Doc();
  online = true;
  constructor(public name: string, clientID: number, private server: Server) {
    this.doc.clientID = clientID; // deterministic conflict resolution for the spike
    this.doc.on("update", (update: Uint8Array, origin: any) => {
      if (origin === "remote") return; // don't echo remote updates back
      if (!this.online) return; // offline edits stay local; synced later via sv diff
      this.server.receiveUpdate(this, update);
    });
    server.clients.push(this);
  }

  deliver(blob: Uint8Array) {
    // A real network wouldn't deliver to an offline client at all.
    if (this.online) Y.applyUpdate(this.doc, blob, "remote");
  }
}

/**
 * Offline catch-up via state vectors + diff updates (as y-protocols would do,
 * with the server relaying the sync messages opaquely — sv messages are NOT
 * journaled; the resulting diff *updates* are journaled like any update).
 */
function reconnect(server: Server, comeback: Client, peer: Client) {
  const svComeback = Y.encodeStateVector(comeback.doc); // comeback -> peer (opaque relay)
  const svPeer = Y.encodeStateVector(peer.doc); // peer -> comeback (opaque relay)
  const diffFromPeer = Y.encodeStateAsUpdate(peer.doc, svComeback); // what comeback missed
  const diffFromComeback = Y.encodeStateAsUpdate(comeback.doc, svPeer); // offline edits
  comeback.online = true;
  server.receiveUpdate(peer, diffFromPeer); // journaled + relayed to comeback
  server.receiveUpdate(comeback, diffFromComeback); // journaled + relayed to peer
  return { diffFromPeer, diffFromComeback };
}

// ------------------------------------------------------------------- set up

const DATA_DIR = `${import.meta.dir}/data`;
mkdirSync(DATA_DIR, { recursive: true });
const rng = mulberry32(0xe5e5);

const server = new Server(`${DATA_DIR}/journal-${Date.now()}.db`);
const A = new Client("A", 1, server);
const B = new Client("B", 2, server);
const tA = A.doc.getText("essay");
const tB = B.doc.getText("essay");
const text = () => tA.toString();
const converged = () => tA.toString() === tB.toString();

console.log("== S5: Yjs collab field over opaque sqlite journal ==\n");

// ================================================================ PART 1
// Concurrent editing session (~500+ journaled update blobs)

console.log("-- Part 1: concurrent editing session --");

// Phase 1: interleaved typing at different positions (A appends the essay
// body char-by-char at the end; B types a title char-by-char at the front).
const P1A =
  "Empirica relays every keystroke as an opaque Yjs update blob; the server appends it to sqlite and forwards it, never parsing CRDT internals. ";
const P1B = "THE OPAQUE JOURNAL:\n";
for (let i = 0; i < Math.max(P1A.length, P1B.length); i++) {
  if (i < P1A.length) tA.insert(tA.length, P1A[i]);
  if (i < P1B.length) tB.insert(i, P1B[i]);
}
check(converged(), `phase 1 interleaved typing converged (${server.journalStats().count} updates)`);

// Phase 2a: conflicting multi-char inserts at the SAME position (true
// concurrency: server paused, so neither client sees the other's insert).
for (let r = 0; r < 10; r++) {
  const pos = Math.floor(tA.length / 2); // same on both (synced before pause)
  server.pause();
  tA.insert(pos, `[A${r}]`);
  tB.insert(pos, `[B${r}]`);
  server.flush();
  if (!converged()) throw new Error(`phase 2a round ${r} diverged`);
}
check(converged(), "phase 2a same-position block conflicts converged (10 rounds)");

// Phase 2b: conflicting keystroke-level typing at the same position.
for (let r = 0; r < 5; r++) {
  const pos = Math.floor(tA.length / 3);
  server.pause();
  for (let k = 0; k < 5; k++) tA.insert(pos + k, "a");
  for (let k = 0; k < 5; k++) tB.insert(pos + k, "b");
  server.flush();
  if (!converged()) throw new Error(`phase 2b round ${r} diverged`);
}
check(converged(), "phase 2b same-position keystroke conflicts converged (5 rounds x 10 keys)");

// Phase 3: deletes, including a concurrent insert INTO a deleted range.
for (let r = 0; r < 5; r++) {
  const p = Math.max(0, tA.length - 30);
  server.pause();
  tA.delete(p, 10); // A deletes a range...
  tB.insert(p + 5, `<b${r}>`); // ...while B concurrently inserts inside it
  server.flush();
  if (!converged()) throw new Error(`phase 3 round ${r} diverged`);
}
for (let i = 0; i < 15; i++) tA.delete(tA.length - 1, 1); // char-by-char deletes
check(converged(), "phase 3 deletes (incl. concurrent insert-into-deleted-range) converged");

// Phase 4: B goes OFFLINE. A keeps typing (journaled live); B types locally
// (nothing sent). Catch-up on reconnect via state vectors + diff updates.
B.online = false;
const P4A = "While B is away, A keeps drafting; every keystroke still lands in the journal. ";
for (const ch of P4A) tA.insert(tA.length, ch);
const P4B = "[B, offline: scribbled thoughts pending sync] ";
for (let i = 0; i < P4B.length; i++) tB.insert(i, P4B[i]);
const seqBeforeReconnect = server.journalStats().maxSeq;
const diffs = reconnect(server, B, A);
check(converged(), "phase 4 offline period + sv/diff catch-up converged");
console.log(
  `        diff blobs journaled at reconnect: peer->B ${diffs.diffFromPeer.length} B (redundant re-journal of A's live updates), B->peer ${diffs.diffFromComeback.length} B (B's ${P4B.length} offline keystrokes)`
);

const compactionSeq = server.journalStats().maxSeq; // compaction point used later
const textAtCompactionSeq = text();

// Phase 5: pure keystroke traffic to measure journal growth per keystroke.
const beforeP5 = server.journalStats();
const P5A =
  "Replay, scrub and compaction must all hold when the engine cannot read the blobs it stores, only order them. ".padEnd(120, "x");
const P5B = "B annotates the front matter with further commentary, one keypress at a time. ".padEnd(120, "y");
for (let i = 0; i < 120; i++) {
  tA.insert(tA.length, P5A[i]);
  tB.insert(P1B.length + i, P5B[i]);
}
const afterP5 = server.journalStats();
const p5Keystrokes = afterP5.count - beforeP5.count;
const bytesPerKeystroke = (afterP5.bytes - beforeP5.bytes) / p5Keystrokes;
check(converged(), "phase 5 keystroke traffic converged");

const live = server.journalStats();
check(live.count >= 500, `journal holds ${live.count} update blobs (>= 500 required)`);
const liveText = text();
console.log(`        live text: ${liveText.length} chars, "${preview(liveText)}"`);

// ================================================================ PART 2
// REPLAY: fresh doc, apply all journaled blobs in seq order.

console.log("\n-- Part 2: replay from journal --");
{
  const t0 = performance.now();
  const fresh = new Y.Doc();
  for (const row of server.rows()) Y.applyUpdate(fresh, row.blob);
  const ms = performance.now() - t0;
  const replayText = fresh.getText("essay").toString();
  check(replayText === liveText, `replay of ${live.count} blobs === live text (${ms.toFixed(1)} ms)`);
  check(!hasPending(fresh), "in-order replay leaves no pending (dangling) structs");
}

// ================================================================ PART 3
// SCRUB: reconstruct doc state at ~10 arbitrary seq points.

console.log("\n-- Part 3: scrub (state at arbitrary seq N) --");
{
  const allRows = server.rows();
  const maxSeq = live.maxSeq;
  const points = new Set<number>([1, Math.floor(maxSeq / 4), seqBeforeReconnect + 1, maxSeq]);
  while (points.size < 10) points.add(1 + Math.floor(rng() * maxSeq));
  const sorted = [...points].sort((a, b) => a - b);

  let prevSV: Map<number, number> | null = null;
  let svMonotonic = true;
  let anyPending = false;
  let totalMs = 0;
  let lastText = "";
  for (const N of sorted) {
    const t0 = performance.now();
    const doc = new Y.Doc();
    for (const row of allRows) {
      if (row.seq > N) break;
      Y.applyUpdate(doc, row.blob);
    }
    totalMs += performance.now() - t0;
    const txt = doc.getText("essay").toString();
    lastText = txt;
    const sv = decodeStateVector(Y.encodeStateVector(doc));
    if (prevSV && !svDominates(sv, prevSV)) svMonotonic = false;
    prevSV = sv;
    if (hasPending(doc)) anyPending = true;
    console.log(`  seq ${String(N).padStart(4)} | len ${String(txt.length).padStart(3)} | "${preview(txt, 64)}"`);
  }
  check(true, `scrubbed ${sorted.length} points without crash (avg ${(totalMs / sorted.length).toFixed(2)} ms/point)`);
  check(svMonotonic, "state vectors are monotonic across ascending scrub points");
  check(!anyPending, "no scrub point had pending structs (every journal prefix is a complete doc state)");
  check(lastText === liveText, "scrub at maxSeq === live text");
}

// ================================================================ PART 4
// ORDERING: do updates commute under arbitrary reorder?

console.log("\n-- Part 4: ordering / commutativity --");
{
  const blobs = server.allBlobs.slice();
  let allOk = true;
  for (let s = 0; s < 5; s++) {
    const doc = new Y.Doc();
    for (const b of shuffled(blobs, rng)) Y.applyUpdate(doc, b);
    if (doc.getText("essay").toString() !== liveText || hasPending(doc)) allOk = false;
  }
  check(allOk, `5 full random shuffles of all ${blobs.length} blobs converge to the live text (no pending)`);

  // But a PREFIX of a shuffled stream is NOT a valid state -> scrub needs
  // the journal's causal (arrival) order.
  const half = shuffled(blobs, rng).slice(0, Math.floor(blobs.length / 2));
  const doc = new Y.Doc();
  for (const b of half) Y.applyUpdate(doc, b);
  const halfLen = doc.getText("essay").toString().length;
  check(
    hasPending(doc),
    `shuffled 50% prefix leaves pending structs (text len ${halfLen}) -> scrub requires causal journal order`
  );
}

// ================================================================ PART 5
// COMPACTION: snapshot at compactionSeq, delete prefix, keep editing.

console.log("\n-- Part 5: compaction --");
{
  // Snapshot is built FROM THE JOURNAL (not from a live doc): replay 1..S.
  const prefixRows = server.rows(compactionSeq);
  const prefixBytes = prefixRows.reduce((a, r) => a + r.blob.length, 0);
  const snapDoc = new Y.Doc();
  for (const row of prefixRows) Y.applyUpdate(snapDoc, row.blob);
  check(
    snapDoc.getText("essay").toString() === textAtCompactionSeq,
    `journal prefix 1..${compactionSeq} reproduces the doc state at compaction point`
  );
  const snapshot = Y.encodeStateAsUpdate(snapDoc);
  server.compact(compactionSeq, snapshot);

  const after = server.journalStats();
  console.log(
    `        compacted: ${prefixRows.length} rows / ${prefixBytes} B -> snapshot ${snapshot.length} B (ratio ${(prefixBytes / snapshot.length).toFixed(2)}x)`
  );
  console.log(
    `        journal now: ${after.count} rows / ${after.bytes} B (+${snapshot.length} B snapshot); before: ${live.count} rows / ${live.bytes} B`
  );

  // CONTINUE EDITING after compaction (including one more concurrent conflict).
  const P6A = " Post-compaction edits keep flowing into the tail of the journal. ";
  for (const ch of P6A) tA.insert(tA.length, ch);
  const P6B = "[post-compaction note] ";
  for (let i = 0; i < P6B.length; i++) tB.insert(P1B.length + i, P6B[i]);
  server.pause();
  tA.insert(Math.floor(tA.length / 2), "{A-late}");
  tB.insert(Math.floor(tB.length / 2), "{B-late}");
  server.flush();
  check(converged(), "post-compaction editing converged");
  const finalText = text();

  // Replay = snapshot + tail rows in seq order.
  const snap = server.snapshot()!;
  const doc = new Y.Doc();
  Y.applyUpdate(doc, snap.blob);
  const tail = server.rows(); // all remaining rows have seq > snap.upto_seq
  for (const row of tail) Y.applyUpdate(doc, row.blob);
  check(
    doc.getText("essay").toString() === finalText && !hasPending(doc),
    `replay snapshot(<=${snap.upto_seq}) + ${tail.length} tail rows === live text`
  );

  // Scrub still works after compaction, but only back to the snapshot seq.
  const mid = tail[Math.floor(tail.length / 2)].seq;
  const scrubDoc = new Y.Doc();
  Y.applyUpdate(scrubDoc, snap.blob);
  for (const row of tail) if (row.seq <= mid) Y.applyUpdate(scrubDoc, row.blob);
  check(
    !hasPending(scrubDoc) && scrubDoc.getText("essay").toString().length > 0,
    `post-compaction scrub at seq ${mid} works (history < seq ${snap.upto_seq} is no longer scrubbable)`
  );

  // Snapshot + tail also commute (snapshot is itself just an update blob).
  const shuffledDoc = new Y.Doc();
  for (const b of shuffled([snap.blob, ...tail.map((r) => r.blob)], rng)) Y.applyUpdate(shuffledDoc, b);
  check(
    shuffledDoc.getText("essay").toString() === finalText,
    "shuffled [snapshot, ...tail] still converges to live text"
  );

  // ---- metrics dump for README
  const sizes = stats(server.allBlobs.map((b) => b.length));
  const finalStats = server.journalStats();
  console.log("\n-- Metrics (essay / Y.Text) --");
  console.log(`  total update blobs journaled : ${sizes.n} (${sizes.total} B)`);
  console.log(
    `  update blob size             : avg ${sizes.avg.toFixed(1)} B, median ${sizes.median} B, min ${sizes.min} B, max ${sizes.max} B`
  );
  console.log(`  journal growth per keystroke : ${bytesPerKeystroke.toFixed(1)} B (${p5Keystrokes} single-char inserts)`);
  console.log(`  reconnect diff blobs         : ${diffs.diffFromPeer.length} B + ${diffs.diffFromComeback.length} B`);
  console.log(`  final doc length             : ${finalText.length} chars`);
  console.log(
    `  compaction                   : ${prefixRows.length} rows / ${prefixBytes} B -> ${snapshot.length} B snapshot (${(prefixBytes / snapshot.length).toFixed(2)}x)`
  );
  console.log(`  journal after compaction     : ${finalStats.count} rows / ${finalStats.bytes} B + snapshot`);
}

// ================================================================ PART 6
// Bonus: Y.Map "whiteboard" (shape positions), same journal model.

console.log("\n-- Part 6: Y.Map whiteboard bonus --");
{
  const wserver = new Server(`${DATA_DIR}/whiteboard-${Date.now()}.db`);
  const WA = new Client("WA", 11, wserver);
  const WB = new Client("WB", 12, wserver);
  const mA = WA.doc.getMap("shapes");
  const mB = WB.doc.getMap("shapes");

  // Live dragging: each set() is one update blob.
  for (let round = 0; round < 3; round++) {
    for (let s = 0; s < 10; s++) {
      mA.set(`shape-${s}`, { x: Math.floor(rng() * 800), y: Math.floor(rng() * 600), by: "A" });
      mB.set(`shape-${s + 5}`, { x: Math.floor(rng() * 800), y: Math.floor(rng() * 600), by: "B" });
    }
  }
  // Concurrent writes to the SAME keys (paused network).
  wserver.pause();
  for (let s = 0; s < 5; s++) {
    mA.set(`shape-${s}`, { x: -1, y: -1, by: "A-conflict" });
    mB.set(`shape-${s}`, { x: -2, y: -2, by: "B-conflict" });
  }
  wserver.flush();

  const jA = canonical(mA.toJSON());
  check(jA === canonical(mB.toJSON()), "whiteboard maps converged after concurrent same-key writes");

  const wstats = wserver.journalStats();
  const fresh = new Y.Doc();
  for (const row of wserver.rows()) Y.applyUpdate(fresh, row.blob);
  check(
    canonical(fresh.getMap("shapes").toJSON()) === jA,
    `whiteboard replay of ${wstats.count} blobs === live map`
  );
  const shuf = new Y.Doc();
  for (const b of shuffled(wserver.allBlobs, rng)) Y.applyUpdate(shuf, b);
  check(
    canonical(shuf.getMap("shapes").toJSON()) === jA && !hasPending(shuf),
    "whiteboard shuffled replay === live map (content-equal; key iteration order may differ)"
  );

  const wsizes = stats(wserver.allBlobs.map((b) => b.length));
  console.log(
    `  whiteboard: ${wsizes.n} blobs, avg ${wsizes.avg.toFixed(1)} B, median ${wsizes.median} B, max ${wsizes.max} B (one blob per position set)`
  );
}

// ----------------------------------------------------------------- verdict
console.log(`\n== ${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"} ==`);
process.exit(failures === 0 ? 0 : 1);
