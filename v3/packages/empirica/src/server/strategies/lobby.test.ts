import { describe, expect, it } from "vitest";
import type { Id } from "../../shared/id.js";
import type { GameRow, PlayerRow, StageRow } from "../db/repo.js";
import {
  individualLobby,
  parseDuration,
  sharedLobby,
} from "./lobby.js";
import type { LobbyConfig, LobbyContext } from "./types.js";

const game: GameRow = {
  id: "game00000000000000000" as Id<"game">,
  batchId: "batch0000000000000000" as Id<"batch">,
  treatment: { playerCount: 3 },
  treatmentName: null,
  status: "lobby",
  currentStageId: null,
  createdAt: 0,
  startedAt: null,
  endedAt: null,
  endedReason: null,
};

const stage: StageRow = {
  id: "stage0000000000000000" as Id<"stage">,
  gameId: game.id,
  roundId: null,
  idx: 0,
  name: "lobby",
  kind: "lobby",
  durationMs: 60_000,
  startedAt: 0,
  endsAt: 60_000,
  endedAt: null,
  lobbyConfig: null,
  createdAt: 0,
};

const config: LobbyConfig = { kind: "shared", durationMs: 60_000, strategy: "fail" };

function p(idx: number, ready: boolean): PlayerRow {
  return {
    id: `p${idx}`.padEnd(21, "_") as Id<"player">,
    gameId: game.id,
    batchId: game.batchId,
    participantId: null,
    status: ready ? "lobby" : "waiting",
    endedReason: null,
    createdAt: 0,
    endedAt: null,
  };
}

function ctx(over: Partial<LobbyContext>): LobbyContext {
  return {
    game,
    stage,
    players: [],
    ready: [],
    treatment: game.treatment,
    config,
    now: 0,
    startedAt: 0,
    ...over,
  };
}

describe("sharedLobby", () => {
  it("returns ready when enough players are ready", () => {
    const fn = sharedLobby({ readyTimeout: 30_000 });
    const r = fn(
      ctx({
        ready: [p(1, true), p(2, true), p(3, true)],
      }),
    );
    expect(r).toEqual({ ready: true });
  });

  it("waits with `until` until the deadline", () => {
    const fn = sharedLobby({ readyTimeout: 30_000 });
    const r = fn(ctx({ ready: [p(1, true)], now: 5_000 }));
    expect(r).toEqual({ wait: true, until: 30_000 });
  });

  it("fails on timeout by default", () => {
    const fn = sharedLobby({ readyTimeout: 30_000 });
    const r = fn(ctx({ ready: [p(1, true)], now: 30_001 }));
    expect(r).toEqual({ fail: "lobby timeout" });
  });

  it("ignores timeout when configured to and at least one is ready", () => {
    const fn = sharedLobby({ readyTimeout: 30_000, onTimeout: "ignore" });
    const r = fn(ctx({ ready: [p(1, true)], now: 30_001 }));
    expect(r).toEqual({ ready: true });
  });

  it("fails on timeout even with `ignore` if zero are ready", () => {
    const fn = sharedLobby({ readyTimeout: 30_000, onTimeout: "ignore" });
    const r = fn(ctx({ ready: [], now: 30_001 }));
    expect(r).toEqual({ fail: "lobby timeout" });
  });

  it("accepts a duration string", () => {
    const fn = sharedLobby({ readyTimeout: "30s" });
    const r = fn(ctx({ ready: [], now: 0 }));
    expect(r).toEqual({ wait: true, until: 30_000 });
  });
});

describe("individualLobby", () => {
  it("requires every expected player to be ready", () => {
    const fn = individualLobby({ readyTimeout: 60_000 });
    const r1 = fn(ctx({ ready: [p(1, true), p(2, true)], now: 0 }));
    expect(r1).toEqual({ wait: true, until: 60_000 });

    const r2 = fn(ctx({ ready: [p(1, true), p(2, true), p(3, true)], now: 0 }));
    expect(r2).toEqual({ ready: true });
  });

  it("fails on timeout regardless of partial readiness", () => {
    const fn = individualLobby({ readyTimeout: 60_000 });
    const r = fn(ctx({ ready: [p(1, true)], now: 60_001 }));
    expect(r).toEqual({ fail: "lobby timeout" });
  });
});

describe("parseDuration", () => {
  it.each([
    ["100ms", 100],
    ["10s", 10_000],
    ["2m", 120_000],
    ["1.5m", 90_000],
    ["1h", 3_600_000],
    ["1d", 86_400_000],
    ["100", 100],
  ])("%s → %d", (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it("rejects invalid input", () => {
    expect(() => parseDuration("abc")).toThrow(RangeError);
    expect(() => parseDuration("")).toThrow(RangeError);
    expect(() => parseDuration("10x")).toThrow(RangeError);
  });
});
