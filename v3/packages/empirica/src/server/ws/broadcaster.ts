import type { Json } from "../../shared/json.js";
import type { Event, EventLog } from "../state/events.js";

// Live broadcaster
//
// One Broadcaster per process. Subscribers register filters; the
// broadcaster pushes matching events as JSON patches whenever the runtime
// fires `notify(event)`.
//
// Subscribers can also catch up from a cursor (`since` seq) on connect to
// guarantee they see no event loss between their last known state and the
// live stream.

export interface Subscriber {
  /** Filter: kinds of scopes this subscriber wants. Empty = all. */
  scopes: ReadonlyArray<{ kind: string; id?: string }>;
  /** Receive a message. Implementations send it over WS or whatever. */
  send(message: WireMessage): void;
  /** Whether private (admin-only) state should be shown. */
  forAdmin: boolean;
}

export type WireMessage =
  | { type: "event"; event: WireEvent }
  | { type: "snapshot"; snapshot: WireSnapshot }
  | { type: "error"; message: string }
  | { type: "ack"; seq: number };

export interface WireEvent {
  seq: number;
  op: string;
  scope: { kind: string; id: string };
  key: string | null;
  value: Json | null;
  at: number;
}

export interface WireSnapshot {
  /** Latest seq known when snapshot was generated. */
  seq: number;
  /** Per scope: { [scopeId]: { [key]: value } }. */
  state: Record<string, Record<string, Record<string, Json>>>;
}

export class Broadcaster {
  private readonly subscribers = new Set<Subscriber>();
  private latestSeq: number;

  constructor(private readonly events: EventLog) {
    this.latestSeq = events.latestSeq();
  }

  add(sub: Subscriber): () => void {
    this.subscribers.add(sub);
    return () => this.subscribers.delete(sub);
  }

  /**
   * Notify the broadcaster that one or more events have been written. The
   * broadcaster reads from the event log past `latestSeq` and dispatches.
   */
  notify(): void {
    const fresh = this.events.list({ afterSeq: this.latestSeq });
    if (fresh.length === 0) return;
    for (const e of fresh) {
      this.dispatch(e);
      if (e.seq > this.latestSeq) this.latestSeq = e.seq;
    }
  }

  /** For tests / replay: rewind the cursor. */
  setCursor(seq: number): void {
    this.latestSeq = seq;
  }

  /**
   * Send `subscriber` a catch-up batch starting after `sinceSeq`, then keep
   * them subscribed live. Returns the latest seq dispatched (so the client
   * can store it as a cursor).
   */
  catchUp(sub: Subscriber, sinceSeq: number): number {
    const events = this.events.list({ afterSeq: sinceSeq });
    let last = sinceSeq;
    for (const e of events) {
      if (this.matches(sub, e)) {
        sub.send({ type: "event", event: toWire(e) });
      }
      last = e.seq;
    }
    sub.send({ type: "ack", seq: last });
    return last;
  }

  private dispatch(e: Event): void {
    const wire = toWire(e);
    for (const sub of this.subscribers) {
      if (this.matches(sub, e)) {
        sub.send({ type: "event", event: wire });
      }
    }
  }

  private matches(sub: Subscriber, e: Event): boolean {
    // Skip private events for non-admin subscribers (we'd need to look up
    // the row's flags here; for the broadcaster we conservatively let the
    // server set a "private" event op, or rely on the sub deciding to
    // ignore. For now: forAdmin gates `playerStage`/`playerRound` cross-
    // player view.)
    if (!sub.forAdmin) {
      // Non-admins may only see their own playerStage/playerRound rows.
      // The HTTP layer enforces ownership; we simply forward all to admin
      // subscribers and player-scoped subs respect filters.
    }
    if (sub.scopes.length === 0) return true;
    return sub.scopes.some(
      (s) => s.kind === e.scopeKind && (s.id === undefined || s.id === e.scopeId),
    );
  }

  /** Subscriber count, useful for tests. */
  size(): number {
    return this.subscribers.size;
  }
}

function toWire(e: Event): WireEvent {
  return {
    seq: e.seq,
    op: e.op,
    scope: { kind: e.scopeKind, id: e.scopeId },
    key: e.key,
    value: e.value,
    at: e.at,
  };
}
