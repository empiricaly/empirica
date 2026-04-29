import type { GameRow } from "../db/repo.js";
import {
  type AssignmentContext,
  type AssignmentDecision,
  type AssignmentFn,
  getPlayerCount,
  isGameOpen,
} from "./types.js";

// Assignment strategies
//
// Each strategy returns a decision; the runtime applies it. Strategies must
// be pure: no I/O, no Date.now, no Math.random. Use ctx.now and ctx.random.

/** First open game in batch order wins. */
export const firstAvailable: AssignmentFn = (ctx) => {
  for (const g of openGamesAcrossBatches(ctx)) {
    return { gameId: g.id };
  }
  return { wait: true };
};

/** Prefer underbooked games; fall back to overbook within the same batch. */
export const balanced: AssignmentFn = (ctx) => {
  for (const batch of runningBatches(ctx)) {
    const candidates = openGamesIn(ctx, batch.id);
    if (candidates.length === 0) continue;

    const underbooked = candidates.filter((g) => roomLeft(ctx, g) > 0);
    if (underbooked.length > 0) {
      return { gameId: pickRandom(underbooked, ctx.random).id };
    }
    return { gameId: pickRandom(candidates, ctx.random).id };
  }
  return { wait: true };
};

/** Never overbook; player waits or exits if no slots. */
export const strict: AssignmentFn = (ctx) => {
  for (const batch of runningBatches(ctx)) {
    const candidates = openGamesIn(ctx, batch.id);
    const underbooked = candidates.filter((g) => roomLeft(ctx, g) > 0);
    if (underbooked.length > 0) {
      return { gameId: pickRandom(underbooked, ctx.random).id };
    }
  }

  // No room anywhere. If the player has previously been assigned, they
  // exit; otherwise they wait for new batches/games.
  if (ctx.player.gameId !== null || ctx.player.endedReason !== null) {
    return { exit: "no more games" };
  }
  return { wait: true };
};

/**
 * Assign only to games whose treatment factor `key` matches the player's
 * value for the same factor. If the player has no value, behave like
 * `balanced`.
 */
export function matchByFactor(key: string, fallback: AssignmentFn = balanced): AssignmentFn {
  return (ctx) => {
    const playerFactor = ctx.player.gameId
      ? null
      : (ctx.player as { factors?: Record<string, unknown> }).factors?.[key] ?? null;
    if (playerFactor === null) return fallback(ctx);

    for (const batch of runningBatches(ctx)) {
      const matches = openGamesIn(ctx, batch.id).filter(
        (g) => g.treatment[key] === playerFactor,
      );
      const underbooked = matches.filter((g) => roomLeft(ctx, g) > 0);
      if (underbooked.length > 0) {
        return { gameId: pickRandom(underbooked, ctx.random).id };
      }
      if (matches.length > 0) {
        return { gameId: pickRandom(matches, ctx.random).id };
      }
    }
    return { wait: true };
  };
}

export const strategies = {
  firstAvailable,
  balanced,
  strict,
  matchByFactor,
} as const;

// ── helpers ────────────────────────────────────────────────────────────────

function* runningBatches(ctx: AssignmentContext) {
  for (const b of ctx.batches) {
    if (b.status !== "running") continue;
    yield b;
  }
}

function openGamesIn(ctx: AssignmentContext, batchId: GameRow["batchId"]): GameRow[] {
  const games = ctx.gamesByBatch.get(batchId) ?? [];
  return games.filter((g) => isGameOpen(g) && !ctx.skip?.has(g.id));
}

function* openGamesAcrossBatches(ctx: AssignmentContext): Iterable<GameRow> {
  for (const b of runningBatches(ctx)) {
    for (const g of openGamesIn(ctx, b.id)) yield g;
  }
}

function roomLeft(ctx: AssignmentContext, g: GameRow): number {
  const cap = getPlayerCount(g.treatment);
  if (cap === undefined) return Infinity;
  const players = ctx.playersByGame.get(g.id) ?? [];
  const inGame = players.filter(
    (p) => p.status === "lobby" || p.status === "playing",
  ).length;
  return cap - inGame;
}

function pickRandom<T>(arr: ReadonlyArray<T>, random: () => number): T {
  if (arr.length === 0) throw new Error("pickRandom: empty array");
  const i = Math.floor(random() * arr.length);
  return arr[i] as T;
}

export { type AssignmentContext, type AssignmentDecision, type AssignmentFn };
