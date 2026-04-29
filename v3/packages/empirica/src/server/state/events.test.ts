import { beforeEach, describe, expect, it } from "vitest";
import { openMemoryDb, type Db } from "../db/db.js";
import { EventLog } from "./events.js";
import { StateStore } from "./store.js";

describe("EventLog", () => {
  let db: Db;
  let store: StateStore;
  let log: EventLog;
  let now = 0;

  beforeEach(() => {
    db = openMemoryDb();
    now = 1_000;
    store = new StateStore(db, () => now++);
    log = new EventLog(db);
  });

  it("list() returns events in seq order", () => {
    const p1 = { kind: "player", id: "p1" };
    const p2 = { kind: "player", id: "p2" };

    store.set(p1, "x", 1);
    store.set(p2, "x", 2);
    store.set(p1, "x", 3);

    const evts = log.list();
    expect(evts.map((e) => [e.scopeId, e.value])).toEqual([
      ["p1", 1],
      ["p2", 2],
      ["p1", 3],
    ]);
    expect(evts[0]?.seq).toBeLessThan(evts[1]!.seq);
  });

  it("afterSeq paginates from a cursor", () => {
    const s = { kind: "x", id: "x" };
    for (let i = 0; i < 10; i++) store.set(s, "k", i);

    const first = log.list({ limit: 5 });
    expect(first).toHaveLength(5);
    expect(first.map((e) => e.value)).toEqual([0, 1, 2, 3, 4]);

    const cursor = first[first.length - 1]!.seq;
    const second = log.list({ afterSeq: cursor });
    expect(second.map((e) => e.value)).toEqual([5, 6, 7, 8, 9]);
  });

  it("scope filter narrows to a single scope", () => {
    store.set({ kind: "player", id: "p1" }, "x", 1);
    store.set({ kind: "player", id: "p2" }, "x", 2);
    store.set({ kind: "game", id: "g1" }, "x", 3);

    const onlyP1 = log.list({ scope: { kind: "player", id: "p1" } });
    expect(onlyP1).toHaveLength(1);
    expect(onlyP1[0]?.value).toBe(1);
  });

  it("scopeKind filter narrows to a kind", () => {
    store.set({ kind: "player", id: "p1" }, "x", 1);
    store.set({ kind: "player", id: "p2" }, "x", 2);
    store.set({ kind: "game", id: "g1" }, "x", 3);

    const players = log.list({ scopeKind: "player" });
    expect(players.map((e) => e.scopeId)).toEqual(["p1", "p2"]);
  });

  it("history() returns ordered changes for a single key", () => {
    const s = { kind: "player", id: "p1" };
    store.set(s, "score", 0);
    store.set(s, "score", 5);
    store.set(s, "score", 10);

    const hist = log.history(s, "score");
    expect(hist.map((h) => h.value)).toEqual([0, 5, 10]);
  });

  it("delete events are recorded with null value", () => {
    const s = { kind: "player", id: "p1" };
    store.set(s, "x", 1);
    store.delete(s, "x");

    const evts = log.list();
    expect(evts.map((e) => [e.op, e.value])).toEqual([
      ["set", 1],
      ["delete", null],
    ]);
  });

  it("latestSeq starts at 0 and advances with each event", () => {
    expect(log.latestSeq()).toBe(0);

    const s = { kind: "x", id: "x" };
    store.set(s, "a", 1);
    expect(log.latestSeq()).toBe(1);
    store.set(s, "b", 2);
    expect(log.latestSeq()).toBe(2);
  });
});
