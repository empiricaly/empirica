import type { Json } from "../shared/json.js";
import type { WireEvent } from "../server/ws/broadcaster.js";

// Client-side cache
//
// Mirrors the server's `state` table for the scopes the client subscribes
// to. Updated by applying WireEvent diffs received from the server.

export interface Snapshot {
  /** Latest applied seq. */
  seq: number;
  /** kind → id → key → value */
  state: Record<string, Record<string, Record<string, Json>>>;
}

export type Unsubscribe = () => void;
export type Subscriber = (snapshot: Snapshot) => void;

export class ClientStore {
  private readonly listeners = new Set<Subscriber>();
  private snapshot: Snapshot = { seq: 0, state: {} };

  get(): Snapshot {
    return this.snapshot;
  }

  subscribe(fn: Subscriber): Unsubscribe {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => this.listeners.delete(fn);
  }

  apply(event: WireEvent): void {
    const next = cloneShallow(this.snapshot.state);
    const kindMap = (next[event.scope.kind] = cloneScope(next[event.scope.kind]));
    const scopeMap = (kindMap[event.scope.id] = cloneScope(kindMap[event.scope.id]));

    if (event.op === "delete" || event.value === null) {
      if (event.key) delete scopeMap[event.key];
    } else if (event.key) {
      scopeMap[event.key] = event.value;
    }

    this.snapshot = { seq: Math.max(this.snapshot.seq, event.seq), state: next };
    for (const fn of this.listeners) fn(this.snapshot);
  }

  /** Replace the cache with a snapshot from the server. */
  replace(seq: number, state: Snapshot["state"]): void {
    this.snapshot = { seq, state };
    for (const fn of this.listeners) fn(this.snapshot);
  }
}

function cloneShallow(s: Snapshot["state"]): Snapshot["state"] {
  const out: Snapshot["state"] = {};
  for (const k of Object.keys(s)) out[k] = s[k] ?? {};
  return out;
}

function cloneScope(s: Record<string, Record<string, Json>> | undefined):
  Record<string, Record<string, Json>>;
function cloneScope(s: Record<string, Json> | undefined): Record<string, Json>;
function cloneScope(s: object | undefined): object {
  return s ? { ...s } : {};
}
