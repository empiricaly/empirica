import { beforeEach, describe, expect, it, vi } from "vitest";
import { openMemoryDb, type Db } from "../db/db.js";
import { createLogger } from "../logger.js";
import { FakeClock } from "../../testing/fake-clock.js";
import { defineCallbacks, HookRegistry } from "./hooks.js";
import { Runtime } from "./runtime.js";

describe("Runtime: end-to-end basic game", () => {
  let db: Db;
  let clock: FakeClock;
  let runtime: Runtime;
  let hooks: HookRegistry;
  const calls: string[] = [];

  beforeEach(() => {
    db = openMemoryDb();
    clock = new FakeClock(1_000_000);
    hooks = defineCallbacks((on) => {
      on.gameCreated(({ game }) => {
        calls.push(`gameCreated:${game.id}`);
        // Add a 30s stage on game creation.
        game.addStage({ name: "guess", durationMs: 30_000 });
      });
      on.gameStart(({ game }) => {
        calls.push(`gameStarted:${game.id}`);
      });
      on.stageStart(({ stage }) => {
        calls.push(`stageStarted:${stage.id}`);
      });
      on.stageEnded(({ stage, cause }) => {
        calls.push(`stageEnded:${stage.id}:${cause}`);
      });
      on.gameEnded(({ game, reason }) => {
        calls.push(`gameEnded:${game.id}:${reason}`);
      });
      on.playerAssigned(({ player, game }) => {
        calls.push(`playerAssigned:${player.id}:${game.id}`);
      });
    });
    calls.length = 0;
    runtime = new Runtime({
      db,
      hooks,
      clock,
      logger: createLogger({ sink: () => {} }),
      random: () => 0,
    });
  });

  it("starts a batch, runs one game with one stage, fires hooks, ends on timeout", () => {
    const batch = runtime.repo.createBatch({ config: { kind: "simple" } });
    runtime.startBatch(batch.id, [
      { treatment: { playerCount: 1 }, treatmentName: "solo", count: 1 },
    ]);

    expect(calls.some((c) => c.startsWith("gameCreated:"))).toBe(true);

    const game = runtime.repo.gamesInBatch(batch.id)[0]!;
    const player = runtime.repo.createPlayer({ batchId: batch.id });

    const decision = runtime.assign(player.id);
    expect(decision).toEqual({ gameId: game.id });
    expect(calls.some((c) => c.startsWith("playerAssigned:"))).toBe(true);

    runtime.startGame(game.id);
    expect(calls.some((c) => c.startsWith("gameStarted:"))).toBe(true);
    expect(calls.some((c) => c.startsWith("stageStarted:"))).toBe(true);

    // Advance the clock past the stage duration; timer should fire.
    clock.advance(30_000);

    expect(calls.some((c) => c.includes("stageEnded:") && c.endsWith(":timeout"))).toBe(true);
    expect(calls.some((c) => c.startsWith("gameEnded:"))).toBe(true);

    expect(runtime.repo.game(game.id)?.status).toBe("ended");
  });

  it("set inside one callback is readable in the next callback (sync semantics)", () => {
    let observed: unknown = null;

    const reg = defineCallbacks((on) => {
      on.gameCreated(({ game }) => {
        game.set("seed", 42);
        game.addStage({ name: "x", durationMs: 1_000 });
      });
      on.gameStart(({ game }) => {
        observed = game.get("seed");
      });
    });

    runtime = new Runtime({
      db,
      hooks: reg,
      clock,
      logger: createLogger({ sink: () => {} }),
    });

    const b = runtime.repo.createBatch({ config: {} });
    runtime.startBatch(b.id, [{ treatment: { playerCount: 1 }, count: 1 }]);
    const g = runtime.repo.gamesInBatch(b.id)[0]!;
    runtime.startGame(g.id);

    expect(observed).toBe(42);
  });

  it("rolls back state writes when a callback throws (post-commit hook tx)", () => {
    const errorEntries: { msg: string }[] = [];
    const reg = defineCallbacks((on) => {
      on.gameCreated(({ game }) => {
        game.set("foo", "before");
        throw new Error("boom");
      });
    });

    runtime = new Runtime({
      db,
      hooks: reg,
      clock,
      logger: createLogger({
        sink: (e) => {
          if (e.level === "error") errorEntries.push({ msg: e.msg });
        },
      }),
    });

    const b = runtime.repo.createBatch({ config: {} });
    // The action itself succeeds (parent tx commits, game rows exist) — but
    // the post-commit hook tx rolls back, and we don't apply the user's
    // partial writes.
    runtime.startBatch(b.id, [{ treatment: { playerCount: 1 }, count: 1 }]);

    const games = runtime.repo.gamesInBatch(b.id);
    expect(games).toHaveLength(1);
    // The user's `set("foo", "before")` was inside the rolled-back hook tx.
    expect(runtime.store.get({ kind: "game", id: games[0]!.id }, "foo")).toBeUndefined();
    // The error was logged.
    expect(errorEntries.some((e) => e.msg.includes("hook handler"))).toBe(true);
  });

  it("propagates exceptions from in-tx hooks (gameStarted) rolling back the action", () => {
    const reg = defineCallbacks((on) => {
      on.gameCreated(({ game }) => {
        game.addStage({ name: "x", durationMs: 1_000 });
      });
      on.gameStart(() => {
        throw new Error("boom-during-start");
      });
    });

    runtime = new Runtime({
      db,
      hooks: reg,
      clock,
      logger: createLogger({ sink: () => {} }),
    });

    const b = runtime.repo.createBatch({ config: {} });
    runtime.startBatch(b.id, [{ treatment: { playerCount: 1 }, count: 1 }]);
    const game = runtime.repo.gamesInBatch(b.id)[0]!;

    expect(() => runtime.startGame(game.id)).toThrow(/boom-during-start/);

    // Status should not have been set to running because the tx rolled back.
    expect(runtime.repo.game(game.id)?.status).toBe("created");
  });

  it("assigns no game when no batch is running and waits", () => {
    const b = runtime.repo.createBatch({ config: {} });
    const p = runtime.repo.createPlayer({ batchId: b.id });

    const decision = runtime.assign(p.id);
    expect(decision).toEqual({ wait: true });
    expect(runtime.repo.player(p.id)?.gameId).toBeNull();
  });

  it("sees the current player in playersInGame after assignment", () => {
    const b = runtime.repo.createBatch({ config: {} });
    runtime.startBatch(b.id, [{ treatment: { playerCount: 4 }, count: 1 }]);
    const g = runtime.repo.gamesInBatch(b.id)[0]!;
    const p = runtime.repo.createPlayer({ batchId: b.id });
    runtime.assign(p.id);

    expect(runtime.repo.playersInGame(g.id).map((x) => x.id)).toEqual([p.id]);
  });

  it("addStage from inside a callback shows up immediately on game.stages()", () => {
    const reg = defineCallbacks((on) => {
      on.gameCreated(({ game }) => {
        game.addStage({ name: "a", durationMs: 1_000 });
        game.addStage({ name: "b", durationMs: 1_000 });
        const ids = game.stages().map((s) => s.row.name);
        expect(ids).toEqual(["a", "b"]);
      });
    });
    runtime = new Runtime({
      db,
      hooks: reg,
      clock,
      logger: createLogger({ sink: () => {} }),
    });
    const b = runtime.repo.createBatch({ config: {} });
    runtime.startBatch(b.id, [{ treatment: {}, count: 1 }]);
  });
});

describe("Runtime: rounds + multi-stage", () => {
  let db: Db;
  let clock: FakeClock;
  let runtime: Runtime;
  const calls: string[] = [];

  beforeEach(() => {
    db = openMemoryDb();
    clock = new FakeClock(0);
    const reg = defineCallbacks((on) => {
      on.gameCreated(({ game }) => {
        const r = game.addRound({ name: "round 1" });
        r.addStage({ name: "guess", durationMs: 10_000 });
        r.addStage({ name: "result", durationMs: 5_000 });
      });
      on.roundStart(({ round }) => calls.push(`roundStart:${round.row.name}`));
      on.roundEnded(({ round }) => calls.push(`roundEnded:${round.row.name}`));
      on.stageStart(({ stage }) => calls.push(`stageStart:${stage.row.name}`));
      on.stageEnded(({ stage, cause }) =>
        calls.push(`stageEnded:${stage.row.name}:${cause}`),
      );
      on.gameEnded(({ reason }) => calls.push(`gameEnded:${reason}`));
    });
    calls.length = 0;
    runtime = new Runtime({
      db,
      hooks: reg,
      clock,
      logger: createLogger({ sink: () => {} }),
    });
  });

  it("walks both stages and ends the game", () => {
    const b = runtime.repo.createBatch({ config: {} });
    runtime.startBatch(b.id, [{ treatment: {}, count: 1 }]);
    const g = runtime.repo.gamesInBatch(b.id)[0]!;
    runtime.startGame(g.id);

    clock.advance(10_000);
    clock.advance(5_000);

    expect(calls).toContain("stageStart:guess");
    expect(calls).toContain("stageEnded:guess:timeout");
    expect(calls).toContain("stageStart:result");
    expect(calls).toContain("stageEnded:result:timeout");
    expect(calls.some((c) => c.startsWith("gameEnded"))).toBe(true);
  });
});
