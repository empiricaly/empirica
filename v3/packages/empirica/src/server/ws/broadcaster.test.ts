import { beforeEach, describe, expect, it } from "vitest";
import { openMemoryDb, type Db } from "../db/db.js";
import { EventLog } from "../state/events.js";
import { StateStore } from "../state/store.js";
import { Broadcaster, type Subscriber, type WireMessage } from "./broadcaster.js";

class CapturingSub implements Subscriber {
  readonly received: WireMessage[] = [];
  constructor(
    public readonly scopes: ReadonlyArray<{ kind: string; id?: string }>,
    public readonly forAdmin: boolean,
  ) {}
  send(m: WireMessage): void {
    this.received.push(m);
  }
}

describe("Broadcaster", () => {
  let db: Db;
  let store: StateStore;
  let log: EventLog;
  let bc: Broadcaster;

  beforeEach(() => {
    db = openMemoryDb();
    let now = 0;
    store = new StateStore(db, () => now++);
    log = new EventLog(db);
    bc = new Broadcaster(log);
  });

  it("notify dispatches new events to all matching subscribers", () => {
    const all = new CapturingSub([], true);
    const onlyPlayer = new CapturingSub([{ kind: "player" }], false);
    bc.add(all);
    bc.add(onlyPlayer);

    store.set({ kind: "player", id: "p1" }, "x", 1);
    store.set({ kind: "game", id: "g1" }, "x", 2);

    bc.notify();

    expect(all.received).toHaveLength(2);
    expect(onlyPlayer.received).toHaveLength(1);
    expect((onlyPlayer.received[0] as { type: string; event: { scope: { id: string } } }).event.scope.id).toBe("p1");
  });

  it("notify is a no-op when there are no new events", () => {
    const sub = new CapturingSub([], true);
    bc.add(sub);
    bc.notify();
    expect(sub.received).toHaveLength(0);
  });

  it("notify advances the cursor; subsequent calls only see new events", () => {
    const sub = new CapturingSub([], true);
    bc.add(sub);

    store.set({ kind: "player", id: "p1" }, "x", 1);
    bc.notify();
    expect(sub.received).toHaveLength(1);

    store.set({ kind: "player", id: "p1" }, "x", 2);
    bc.notify();
    expect(sub.received).toHaveLength(2);
  });

  it("scope id filter narrows further than kind filter", () => {
    const sub = new CapturingSub([{ kind: "player", id: "p2" }], true);
    bc.add(sub);

    store.set({ kind: "player", id: "p1" }, "x", 1);
    store.set({ kind: "player", id: "p2" }, "x", 2);
    bc.notify();

    expect(sub.received).toHaveLength(1);
    expect((sub.received[0] as { event: { value: number } }).event.value).toBe(2);
  });

  it("catchUp replays past events then sends ack", () => {
    store.set({ kind: "player", id: "p1" }, "x", 1);
    store.set({ kind: "player", id: "p1" }, "x", 2);
    store.set({ kind: "game", id: "g1" }, "y", 3);

    const sub = new CapturingSub([{ kind: "player" }], false);
    const lastSeq = bc.catchUp(sub, 0);
    expect(lastSeq).toBe(3);
    expect(sub.received.filter((m) => m.type === "event")).toHaveLength(2);
    expect(sub.received[sub.received.length - 1]).toMatchObject({ type: "ack" });
  });

  it("removed subscribers stop receiving events", () => {
    const sub = new CapturingSub([], true);
    const remove = bc.add(sub);

    store.set({ kind: "x", id: "x" }, "k", 1);
    bc.notify();
    expect(sub.received).toHaveLength(1);

    remove();
    store.set({ kind: "x", id: "x" }, "k", 2);
    bc.notify();
    expect(sub.received).toHaveLength(1);

    expect(bc.size()).toBe(0);
  });
});
