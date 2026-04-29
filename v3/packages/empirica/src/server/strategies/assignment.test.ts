import { describe, expect, it } from "vitest";
import type { Id } from "../../shared/id.js";
import type { JsonObject } from "../../shared/json.js";
import type { BatchRow, GameRow, PlayerRow } from "../db/repo.js";
import {
  balanced,
  firstAvailable,
  matchByFactor,
  strict,
} from "./assignment.js";
import type { AssignmentContext } from "./types.js";

// Test helpers — build rich AssignmentContext fixtures with sensible defaults.

let idCounter = 0;
function freshId<K extends string>(): Id<K> {
  idCounter++;
  return `id_${idCounter}_${"x".repeat(15)}`.slice(0, 21) as Id<K>;
}

function batch(over: Partial<BatchRow> = {}): BatchRow {
  return {
    id: freshId<"batch">(),
    status: "running",
    config: {},
    lobbyConfig: null,
    name: null,
    createdAt: 0,
    startedAt: 0,
    endedAt: null,
    endedReason: null,
    ...over,
  };
}

function game(batchId: Id<"batch">, treatment: JsonObject = {}, over: Partial<GameRow> = {}): GameRow {
  return {
    id: freshId<"game">(),
    batchId,
    treatment,
    treatmentName: null,
    status: "created",
    currentStageId: null,
    createdAt: 0,
    startedAt: null,
    endedAt: null,
    endedReason: null,
    ...over,
  };
}

function player(over: Partial<PlayerRow> = {}): PlayerRow {
  return {
    id: freshId<"player">(),
    gameId: null,
    batchId: null,
    participantId: null,
    status: "waiting",
    endedReason: null,
    createdAt: 0,
    endedAt: null,
    ...over,
  };
}

function makeContext(spec: {
  player: PlayerRow;
  batches: BatchRow[];
  games: GameRow[];
  playersInGame?: Map<Id<"game">, PlayerRow[]>;
  random?: () => number;
  skip?: Set<Id<"game">>;
}): AssignmentContext {
  const gamesByBatch = new Map<Id<"batch">, GameRow[]>();
  for (const g of spec.games) {
    const list = gamesByBatch.get(g.batchId) ?? [];
    list.push(g);
    gamesByBatch.set(g.batchId, list);
  }
  const ctx: AssignmentContext = {
    player: spec.player,
    batches: spec.batches,
    gamesByBatch,
    playersByGame: spec.playersInGame ?? new Map(),
    now: 0,
    random: spec.random ?? (() => 0),
  };
  if (spec.skip) (ctx as { skip?: Set<Id<"game">> }).skip = spec.skip;
  return ctx;
}

describe("firstAvailable", () => {
  it("returns the first open game in batch order", () => {
    const b = batch();
    const g1 = game(b.id);
    const g2 = game(b.id);

    const ctx = makeContext({ player: player(), batches: [b], games: [g1, g2] });
    expect(firstAvailable(ctx)).toEqual({ gameId: g1.id });
  });

  it("waits when no batch is running", () => {
    const b = batch({ status: "created" });
    const g = game(b.id);
    const ctx = makeContext({ player: player(), batches: [b], games: [g] });
    expect(firstAvailable(ctx)).toEqual({ wait: true });
  });

  it("waits when all games are ended", () => {
    const b = batch();
    const g = game(b.id, {}, { status: "ended" });
    const ctx = makeContext({ player: player(), batches: [b], games: [g] });
    expect(firstAvailable(ctx)).toEqual({ wait: true });
  });

  it("respects the skip set", () => {
    const b = batch();
    const g1 = game(b.id);
    const g2 = game(b.id);
    const ctx = makeContext({
      player: player(),
      batches: [b],
      games: [g1, g2],
      skip: new Set([g1.id]),
    });
    expect(firstAvailable(ctx)).toEqual({ gameId: g2.id });
  });
});

describe("balanced", () => {
  it("prefers an underbooked game over a full one", () => {
    const b = batch();
    const full = game(b.id, { playerCount: 1 });
    const open = game(b.id, { playerCount: 2 });

    const ctx = makeContext({
      player: player(),
      batches: [b],
      games: [full, open],
      playersInGame: new Map([
        [full.id, [player({ status: "lobby", gameId: full.id })]],
      ]),
    });
    expect(balanced(ctx)).toEqual({ gameId: open.id });
  });

  it("overbooks within the batch when all are full", () => {
    const b = batch();
    const g1 = game(b.id, { playerCount: 1 });
    const g2 = game(b.id, { playerCount: 1 });
    const ctx = makeContext({
      player: player(),
      batches: [b],
      games: [g1, g2],
      playersInGame: new Map([
        [g1.id, [player({ status: "lobby", gameId: g1.id })]],
        [g2.id, [player({ status: "lobby", gameId: g2.id })]],
      ]),
      // Deterministic: pick index 0.
      random: () => 0,
    });
    const decision = balanced(ctx);
    expect("gameId" in decision).toBe(true);
  });

  it("treats games without playerCount as having infinite room", () => {
    const b = batch();
    const g = game(b.id, {});
    const ctx = makeContext({
      player: player(),
      batches: [b],
      games: [g],
      playersInGame: new Map([
        [g.id, Array.from({ length: 5 }, () => player({ status: "lobby", gameId: g.id }))],
      ]),
    });
    expect(balanced(ctx)).toEqual({ gameId: g.id });
  });

  it("waits when no running batch has any open games", () => {
    const b = batch();
    const g = game(b.id, {}, { status: "ended" });
    const ctx = makeContext({ player: player(), batches: [b], games: [g] });
    expect(balanced(ctx)).toEqual({ wait: true });
  });
});

describe("strict", () => {
  it("waits when full and player is brand-new", () => {
    const b = batch();
    const g = game(b.id, { playerCount: 1 });
    const ctx = makeContext({
      player: player(),
      batches: [b],
      games: [g],
      playersInGame: new Map([
        [g.id, [player({ status: "lobby", gameId: g.id })]],
      ]),
    });
    expect(strict(ctx)).toEqual({ wait: true });
  });

  it("exits when full and the player has previously been placed", () => {
    const b = batch();
    const g = game(b.id, { playerCount: 1 });
    const ctx = makeContext({
      player: player({ endedReason: "game ended" }),
      batches: [b],
      games: [g],
      playersInGame: new Map([
        [g.id, [player({ status: "lobby", gameId: g.id })]],
      ]),
    });
    const decision = strict(ctx);
    expect(decision).toEqual({ exit: "no more games" });
  });

  it("places into an underbooked game", () => {
    const b = batch();
    const g = game(b.id, { playerCount: 4 });
    const ctx = makeContext({
      player: player(),
      batches: [b],
      games: [g],
      playersInGame: new Map([
        [g.id, [player({ status: "lobby", gameId: g.id })]],
      ]),
    });
    expect(strict(ctx)).toEqual({ gameId: g.id });
  });
});

describe("matchByFactor", () => {
  it("falls back when player has no factor value", () => {
    const b = batch();
    const g1 = game(b.id, { groupKey: "A" });
    const ctx = makeContext({ player: player(), batches: [b], games: [g1] });
    const decision = matchByFactor("groupKey")(ctx);
    expect("gameId" in decision).toBe(true);
  });
});

describe("invariants (random sweep)", () => {
  it("balanced never picks a skipped game", () => {
    const b = batch();
    const g1 = game(b.id, { playerCount: 4 });
    const g2 = game(b.id, { playerCount: 4 });

    for (let r = 0; r < 100; r++) {
      const ctx = makeContext({
        player: player(),
        batches: [b],
        games: [g1, g2],
        skip: new Set([g1.id]),
        random: () => r / 100,
      });
      const d = balanced(ctx);
      if ("gameId" in d) expect(d.gameId).toBe(g2.id);
    }
  });

  it("strict never overbooks", () => {
    const b = batch();
    const g = game(b.id, { playerCount: 2 });
    const inGame = [
      player({ status: "lobby", gameId: g.id }),
      player({ status: "lobby", gameId: g.id }),
    ];
    const ctx = makeContext({
      player: player(),
      batches: [b],
      games: [g],
      playersInGame: new Map([[g.id, inGame]]),
    });
    const d = strict(ctx);
    expect("gameId" in d).toBe(false);
  });
});
