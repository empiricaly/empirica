import { describe, expect, it, vi } from "vitest";
import { ClientStore } from "./store.js";

describe("ClientStore", () => {
  it("starts empty", () => {
    const s = new ClientStore();
    expect(s.get()).toEqual({ seq: 0, state: {} });
  });

  it("apply sets a value at scope/key and tracks seq", () => {
    const s = new ClientStore();
    s.apply({
      seq: 5,
      op: "set",
      scope: { kind: "player", id: "p1" },
      key: "x",
      value: 42,
      at: 0,
    });
    expect(s.get().seq).toBe(5);
    expect(s.get().state["player"]?.["p1"]?.["x"]).toBe(42);
  });

  it("apply with delete op removes the key", () => {
    const s = new ClientStore();
    s.apply({
      seq: 1,
      op: "set",
      scope: { kind: "player", id: "p1" },
      key: "x",
      value: 1,
      at: 0,
    });
    s.apply({
      seq: 2,
      op: "delete",
      scope: { kind: "player", id: "p1" },
      key: "x",
      value: null,
      at: 0,
    });
    expect(s.get().state["player"]?.["p1"]?.["x"]).toBeUndefined();
  });

  it("subscribers receive an immediate call and then every update", () => {
    const s = new ClientStore();
    const fn = vi.fn();
    s.subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    s.apply({
      seq: 1,
      op: "set",
      scope: { kind: "x", id: "x" },
      key: "k",
      value: 1,
      at: 0,
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe stops receiving updates", () => {
    const s = new ClientStore();
    const fn = vi.fn();
    const off = s.subscribe(fn);
    off();
    s.apply({
      seq: 1,
      op: "set",
      scope: { kind: "x", id: "x" },
      key: "k",
      value: 1,
      at: 0,
    });
    expect(fn).toHaveBeenCalledTimes(1); // only the initial call
  });

  it("seq monotonically advances; out-of-order events do not regress", () => {
    const s = new ClientStore();
    s.apply({
      seq: 5,
      op: "set",
      scope: { kind: "x", id: "x" },
      key: "k",
      value: 1,
      at: 0,
    });
    s.apply({
      seq: 3,
      op: "set",
      scope: { kind: "x", id: "x" },
      key: "k2",
      value: 2,
      at: 0,
    });
    expect(s.get().seq).toBe(5);
  });

  it("replace overwrites everything", () => {
    const s = new ClientStore();
    s.apply({
      seq: 1,
      op: "set",
      scope: { kind: "a", id: "a" },
      key: "k",
      value: 1,
      at: 0,
    });
    s.replace(10, { game: { g1: { k: "v" } } });
    expect(s.get().seq).toBe(10);
    expect(s.get().state).toEqual({ game: { g1: { k: "v" } } });
  });
});
