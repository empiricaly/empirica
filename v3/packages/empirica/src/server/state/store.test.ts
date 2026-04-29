import { beforeEach, describe, expect, it } from "vitest";
import { openMemoryDb, type Db } from "../db/db.js";
import { ImmutableError, StateStore } from "./store.js";

describe("StateStore", () => {
  let db: Db;
  let now: number;
  let store: StateStore;

  beforeEach(() => {
    db = openMemoryDb();
    now = 1_000;
    store = new StateStore(db, () => now);
  });

  const player = { kind: "player", id: "p1" };

  it("get returns undefined when key is unset", () => {
    expect(store.get(player, "x")).toBeUndefined();
    expect(store.has(player, "x")).toBe(false);
  });

  it("set then get returns the same value within the same connection", () => {
    store.set(player, "x", 42);
    expect(store.get(player, "x")).toBe(42);
    expect(store.has(player, "x")).toBe(true);
  });

  it("set persists JSON values lossless-roundtrip", () => {
    const value = {
      a: 1,
      b: "two",
      c: [3, 4, { d: null }],
      e: true,
    } as const;
    store.set(player, "obj", value);
    expect(store.get(player, "obj")).toEqual(value);
  });

  it("set logs an event", () => {
    store.set(player, "x", 1, { by: "runtime" });

    const evts = db.$sqlite
      .prepare("SELECT * FROM events ORDER BY seq")
      .all() as {
      op: string;
      scope_kind: string;
      scope_id: string;
      key: string;
      value_json: string;
      by: string;
      at: number;
    }[];

    expect(evts).toHaveLength(1);
    expect(evts[0]).toMatchObject({
      op: "set",
      scope_kind: "player",
      scope_id: "p1",
      key: "x",
      value_json: "1",
      by: "runtime",
      at: 1_000,
    });
  });

  it("subsequent set updates value and OR-merges flags", () => {
    store.set(player, "x", 1);
    store.set(player, "x", 2, { private: true });
    expect(store.get(player, "x")).toBe(2);
    expect(store.flags(player, "x")).toBeGreaterThan(0);
  });

  it("immutable flag prevents subsequent writes", () => {
    store.set(player, "id", "abc", { immutable: true });
    expect(() => store.set(player, "id", "xyz")).toThrow(ImmutableError);
    expect(store.get(player, "id")).toBe("abc");
  });

  it("delete returns true and emits an event", () => {
    store.set(player, "x", 1);
    const ok = store.delete(player, "x");
    expect(ok).toBe(true);
    expect(store.has(player, "x")).toBe(false);

    const ops = db.$sqlite
      .prepare("SELECT op FROM events ORDER BY seq")
      .all() as { op: string }[];
    expect(ops.map((o) => o.op)).toEqual(["set", "delete"]);
  });

  it("delete on missing key returns false and emits no event", () => {
    expect(store.delete(player, "missing")).toBe(false);
    const events = db.$sqlite
      .prepare("SELECT * FROM events")
      .all();
    expect(events).toHaveLength(0);
  });

  it("delete on immutable key throws", () => {
    store.set(player, "id", "abc", { immutable: true });
    expect(() => store.delete(player, "id")).toThrow(ImmutableError);
  });

  it("all() returns every key in the scope", () => {
    store.set(player, "a", 1);
    store.set(player, "b", "two");
    expect(store.all(player)).toEqual({ a: 1, b: "two" });
  });

  it("visible() drops PRIVATE keys for non-admins, keeps for admins", () => {
    store.set(player, "name", "Alice");
    store.set(player, "secret", "shh", { private: true });

    expect(store.visible(player, false)).toEqual({ name: "Alice" });
    expect(store.visible(player, true)).toEqual({ name: "Alice", secret: "shh" });
  });

  it("scopes are isolated", () => {
    const game = { kind: "game", id: "g1" };
    store.set(player, "x", "player");
    store.set(game, "x", "game");

    expect(store.get(player, "x")).toBe("player");
    expect(store.get(game, "x")).toBe("game");
  });
});
