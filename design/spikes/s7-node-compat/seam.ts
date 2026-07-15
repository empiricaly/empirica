// S7: the v3 engine's platform seam — the ONLY surface the engine touches for
// SQLite and WebSockets. server.ts/bench.ts are written against these types;
// platform-node.ts implements them with better-sqlite3 + ws. The S1 Bun code is
// the same shape with bun:sqlite + Bun.serve (a platform-bun.ts would be ~60 lines).
//
// Types-only module: erased at runtime by Node 22's type stripping.

// ---------------------------------------------------------------- SqliteDriver
export interface SqliteStmt<Row = unknown> {
  /** First row or null/undefined if none. (bun:sqlite returns null, better-sqlite3
   * returns undefined — engine code must use `?? / ?.`, never `=== null`.) */
  get(...args: unknown[]): Row | null | undefined;
  run(...args: unknown[]): void;
  all(...args: unknown[]): Row[];
}

/** Calling the txn runs it under plain BEGIN (deferred); `.immediate` under
 * BEGIN IMMEDIATE. Both bun:sqlite and better-sqlite3 natively expose exactly
 * this shape (bun copied better-sqlite3's API). */
export interface SqliteTxn<Args extends unknown[] = unknown[], R = unknown> {
  (...args: Args): R;
  immediate(...args: Args): R;
}

export interface SqliteDriver {
  /** Run one or more statements; results discarded (DDL, PRAGMA writes). */
  exec(sql: string): void;
  /** Prepare once, reuse forever. NOT cached by SQL string — the engine owns reuse.
   * (bun's db.query() caches; better-sqlite3 has no cached variant — the seam
   * standardizes on the uncached contract so both backends behave identically.) */
  prepare<Row = unknown>(sql: string): SqliteStmt<Row>;
  transaction<Args extends unknown[], R>(fn: (...args: Args) => R): SqliteTxn<Args, R>;
  close(): void;
}

// ---------------------------------------------------------------- WsServer
export interface PlatformSocket<Ctx> {
  /** Per-connection context captured at upgrade time (Bun: ws.data; Node: attached at handleUpgrade). */
  data: Ctx;
  send(message: string): void;
  subscribe(topic: string): void;
}

export interface PublishResult {
  /** Sockets the frame was queued to (includes a subscribed sender — Bun
   * server.publish() echo semantics; see README). */
  queued: number;
  /** Sockets whose send buffer exceeded the seam's high-water mark (1 MiB here).
   * Bun impl maps its publish() return of -1 to 1. */
  backpressure: number;
  /** Subscribed sockets skipped because not OPEN. Bun impl maps return 0 (with
   * live subscribers) to 1. */
  dropped: number;
}

export interface WsServerOptions<Ctx> {
  port: number;
  /** Build the per-connection context from the upgrade URL (query params). */
  context(url: URL): Ctx;
  /** Plain-HTTP hook: return a JSON-able object to answer (used for /stats), or undefined to 404. */
  http?(url: URL): object | undefined;
  open?(sock: PlatformSocket<Ctx>): void;
  message(sock: PlatformSocket<Ctx>, raw: string): void;
  close?(sock: PlatformSocket<Ctx>): void;
}

export interface WsServer<Ctx> {
  /** Serialize-once fanout of a TEXT frame to every subscriber of topic. */
  publish(topic: string, message: string): PublishResult;
  /** Implementation-side counters (max per-socket bufferedAmount seen, send errors). */
  metrics(): { maxBufferedAmount: number; sendErrors: number };
  stop(): void;
}
