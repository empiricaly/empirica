import { describe, expect, it } from "vitest";
import { createLogger, type LogEntry } from "./logger.js";

describe("createLogger sink", () => {
  function captured() {
    const entries: LogEntry[] = [];
    const log = createLogger({ sink: (e) => entries.push(e) });
    return { entries, log };
  }

  it("emits each level with msg and fields", () => {
    const { entries, log } = captured();

    log.trace("t", { a: 1 });
    log.debug("d", { a: 2 });
    log.info("i", { a: 3 });
    log.warn("w", { a: 4 });
    log.error("e", { a: 5 });

    expect(entries.map((e) => [e.level, e.msg, e.fields.a])).toEqual([
      ["trace", "t", 1],
      ["debug", "d", 2],
      ["info", "i", 3],
      ["warn", "w", 4],
      ["error", "e", 5],
    ]);
  });

  it("child loggers carry bindings down", () => {
    const { entries, log } = captured();

    const game = log.child({ gameId: "g1" });
    const player = game.child({ playerId: "p1" });

    player.info("hello");

    expect(entries).toHaveLength(1);
    expect(entries[0]?.bindings).toEqual({ gameId: "g1", playerId: "p1" });
  });

  it("later child bindings override earlier ones", () => {
    const { entries, log } = captured();

    const a = log.child({ tag: "a" });
    const b = a.child({ tag: "b" });

    b.info("override");

    expect(entries[0]?.bindings.tag).toBe("b");
  });

  it("omitted fields default to an empty object", () => {
    const { entries, log } = captured();
    log.info("no fields");
    expect(entries[0]?.fields).toEqual({});
  });
});
