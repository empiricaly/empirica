import type { Json } from "../../shared/json.js";
import type { Db } from "../db/db.js";

// Event log queries
//
// The store writes events; this module reads them. Used by exports, replay,
// and the WebSocket broadcaster's catch-up cursor.

export interface Event {
  seq: number;
  op: string;
  scopeKind: string;
  scopeId: string;
  key: string | null;
  value: Json | null;
  by: string | null;
  at: number;
}

export interface ListEventsOptions {
  /** Inclusive lower bound on `seq`. */
  afterSeq?: number;
  /** Restrict to a single scope. */
  scope?: { kind: string; id: string };
  /** Restrict to a kind across all ids. */
  scopeKind?: string;
  /** Hard cap on result size; default 1000. */
  limit?: number;
}

interface Row {
  seq: number;
  op: string;
  scope_kind: string;
  scope_id: string;
  key: string | null;
  value_json: string | null;
  by: string | null;
  at: number;
}

export class EventLog {
  constructor(private readonly db: Db) {}

  list(opts: ListEventsOptions = {}): Event[] {
    const limit = Math.min(opts.limit ?? 1000, 10_000);
    const where: string[] = [];
    const args: (string | number)[] = [];

    if (opts.afterSeq !== undefined) {
      where.push("seq > ?");
      args.push(opts.afterSeq);
    }
    if (opts.scope) {
      where.push("scope_kind = ? AND scope_id = ?");
      args.push(opts.scope.kind, opts.scope.id);
    } else if (opts.scopeKind) {
      where.push("scope_kind = ?");
      args.push(opts.scopeKind);
    }

    const whereSql = where.length === 0 ? "" : `WHERE ${where.join(" AND ")}`;
    const rows = this.db.$sqlite
      .prepare(
        `SELECT seq, op, scope_kind, scope_id, key, value_json, by, at
         FROM events
         ${whereSql}
         ORDER BY seq
         LIMIT ${limit}`,
      )
      .all(...args) as Row[];

    return rows.map(rowToEvent);
  }

  /**
   * Return the history of values for a single (scope, key). Cheap and
   * cacheable for export.
   */
  history(scope: { kind: string; id: string }, key: string): Event[] {
    const rows = this.db.$sqlite
      .prepare(
        `SELECT seq, op, scope_kind, scope_id, key, value_json, by, at
         FROM events
         WHERE scope_kind = ? AND scope_id = ? AND key = ?
         ORDER BY seq`,
      )
      .all(scope.kind, scope.id, key) as Row[];
    return rows.map(rowToEvent);
  }

  /** The latest seq currently stored. Useful for catch-up cursors. */
  latestSeq(): number {
    const row = this.db.$sqlite
      .prepare("SELECT COALESCE(MAX(seq), 0) AS seq FROM events")
      .get() as { seq: number };
    return row.seq;
  }
}

function rowToEvent(r: Row): Event {
  return {
    seq: r.seq,
    op: r.op,
    scopeKind: r.scope_kind,
    scopeId: r.scope_id,
    key: r.key,
    value: r.value_json === null ? null : (JSON.parse(r.value_json) as Json),
    by: r.by,
    at: r.at,
  };
}
