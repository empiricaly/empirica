import type { Database, Statement } from "better-sqlite3";
import type { Json } from "../../shared/json.js";
import type { Db } from "../db/db.js";

// State store
//
// One narrow API for "scoped key/value reads + writes." Every set goes
// through here so we get the event-log entry for free.
//
// Flag bits: keep in sync with schema.ts.
export const FLAG_IMMUTABLE = 1 << 0;
export const FLAG_PRIVATE = 1 << 1;
export const FLAG_PROTECTED = 1 << 2;

export type Flags = number;

export interface SetOptions {
  /** If true, after the first write further writes throw. */
  immutable?: boolean;
  /** If true, value is not surfaced to non-admin subscribers. */
  private?: boolean;
  /** If true, only the runtime may write (callbacks-only flag is checked at the API surface). */
  protected?: boolean;
  /** Identifier of the writer (`"runtime"`, `"player:<id>"`, `"admin:<id>"`). */
  by?: string;
}

export interface ScopeRef {
  kind: string;
  id: string;
}

export class ImmutableError extends Error {
  constructor(scope: ScopeRef, key: string) {
    super(`state[${scope.kind}:${scope.id}].${key} is immutable`);
    this.name = "ImmutableError";
  }
}

export class StateStore {
  private readonly _set: Statement;
  private readonly _read: Statement;
  private readonly _delete: Statement;
  private readonly _all: Statement;
  private readonly _flags: Statement;
  private readonly _logEvent: Statement;

  constructor(
    private readonly db: Db,
    private readonly now: () => number,
  ) {
    const sqlite: Database = db.$sqlite;

    this._read = sqlite.prepare(
      `SELECT value_json, flags FROM state
       WHERE scope_kind = ? AND scope_id = ? AND key = ?`,
    );

    this._set = sqlite.prepare(
      `INSERT INTO state(scope_kind, scope_id, key, value_json, flags, updated_at)
       VALUES (@scope_kind, @scope_id, @key, @value_json, @flags, @updated_at)
       ON CONFLICT(scope_kind, scope_id, key) DO UPDATE SET
         value_json = excluded.value_json,
         flags = state.flags | excluded.flags,
         updated_at = excluded.updated_at`,
    );

    this._delete = sqlite.prepare(
      `DELETE FROM state WHERE scope_kind = ? AND scope_id = ? AND key = ?`,
    );

    this._all = sqlite.prepare(
      `SELECT key, value_json, flags FROM state
       WHERE scope_kind = ? AND scope_id = ?
       ORDER BY key`,
    );

    this._flags = sqlite.prepare(
      `SELECT flags FROM state WHERE scope_kind = ? AND scope_id = ? AND key = ?`,
    );

    this._logEvent = sqlite.prepare(
      `INSERT INTO events(op, scope_kind, scope_id, key, value_json, by, at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
  }

  get(scope: ScopeRef, key: string): Json | undefined {
    const row = this._read.get(scope.kind, scope.id, key) as
      | { value_json: string }
      | undefined;
    if (!row) return undefined;
    return JSON.parse(row.value_json) as Json;
  }

  has(scope: ScopeRef, key: string): boolean {
    return this._flags.get(scope.kind, scope.id, key) !== undefined;
  }

  flags(scope: ScopeRef, key: string): Flags {
    const row = this._flags.get(scope.kind, scope.id, key) as
      | { flags: number }
      | undefined;
    return row?.flags ?? 0;
  }

  set(scope: ScopeRef, key: string, value: Json, opts: SetOptions = {}): void {
    const existing = this._flags.get(scope.kind, scope.id, key) as
      | { flags: number }
      | undefined;
    if (existing && (existing.flags & FLAG_IMMUTABLE) !== 0) {
      throw new ImmutableError(scope, key);
    }

    let flags = 0;
    if (opts.immutable) flags |= FLAG_IMMUTABLE;
    if (opts.private) flags |= FLAG_PRIVATE;
    if (opts.protected) flags |= FLAG_PROTECTED;

    const now = this.now();
    const valueJson = JSON.stringify(value);

    this._set.run({
      scope_kind: scope.kind,
      scope_id: scope.id,
      key,
      value_json: valueJson,
      flags,
      updated_at: now,
    });

    this._logEvent.run("set", scope.kind, scope.id, key, valueJson, opts.by ?? null, now);
  }

  delete(scope: ScopeRef, key: string, opts: SetOptions = {}): boolean {
    const existing = this._flags.get(scope.kind, scope.id, key) as
      | { flags: number }
      | undefined;
    if (!existing) return false;
    if ((existing.flags & FLAG_IMMUTABLE) !== 0) {
      throw new ImmutableError(scope, key);
    }

    const now = this.now();
    this._delete.run(scope.kind, scope.id, key);
    this._logEvent.run("delete", scope.kind, scope.id, key, null, opts.by ?? null, now);
    return true;
  }

  /** Read every key in a scope as a plain object. */
  all(scope: ScopeRef): Record<string, Json> {
    const rows = this._all.all(scope.kind, scope.id) as {
      key: string;
      value_json: string;
    }[];
    const out: Record<string, Json> = {};
    for (const r of rows) out[r.key] = JSON.parse(r.value_json) as Json;
    return out;
  }

  /**
   * Read every key in a scope, applying the privacy filter. When `forAdmin`
   * is false, FLAG_PRIVATE keys are dropped.
   */
  visible(scope: ScopeRef, forAdmin: boolean): Record<string, Json> {
    const rows = this._all.all(scope.kind, scope.id) as {
      key: string;
      value_json: string;
      flags: number;
    }[];
    const out: Record<string, Json> = {};
    for (const r of rows) {
      if (!forAdmin && (r.flags & FLAG_PRIVATE) !== 0) continue;
      out[r.key] = JSON.parse(r.value_json) as Json;
    }
    return out;
  }
}
