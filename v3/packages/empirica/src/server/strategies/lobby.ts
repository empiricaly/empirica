import {
  getPlayerCount,
  type LobbyConfig,
  type LobbyContext,
  type LobbyDecision,
  type LobbyFn,
} from "./types.js";

// Lobby strategies
//
// `shared` waits for N ready players (where N = treatment.playerCount) until
// the timeout. On timeout, either fails the game (`strategy: "fail"`) or
// starts with whoever is ready (`strategy: "ignore"`).
//
// `individual` waits a per-player timer; we only return `ready` when *every*
// expected player has signalled. On timeout it never starts; it always fails
// with the reason "lobby timeout."

export interface SharedLobbyOptions {
  /** Lobby duration. Numbers are ms; strings are parsed by parseDuration. */
  readyTimeout: number | string;
  /** Default "fail". */
  onTimeout?: "fail" | "ignore";
}

export function sharedLobby(opts: SharedLobbyOptions): LobbyFn {
  const ms = typeof opts.readyTimeout === "number"
    ? opts.readyTimeout
    : parseDuration(opts.readyTimeout);
  const onTimeout = opts.onTimeout ?? "fail";

  return (ctx) => {
    const required = getPlayerCount(ctx.treatment) ?? ctx.players.length;
    if (ctx.ready.length >= required) return { ready: true };

    const deadline = ctx.startedAt + ms;
    if (ctx.now < deadline) return { wait: true, until: deadline };

    // Timed out.
    if (onTimeout === "ignore" && ctx.ready.length > 0) return { ready: true };
    return { fail: "lobby timeout" };
  };
}

export interface IndividualLobbyOptions {
  /** Per-player timer (ms or duration string). */
  readyTimeout: number | string;
}

export function individualLobby(opts: IndividualLobbyOptions): LobbyFn {
  const ms = typeof opts.readyTimeout === "number"
    ? opts.readyTimeout
    : parseDuration(opts.readyTimeout);

  return (ctx) => {
    const required = getPlayerCount(ctx.treatment) ?? ctx.players.length;
    if (ctx.ready.length >= required) return { ready: true };

    const deadline = ctx.startedAt + ms;
    if (ctx.now < deadline) return { wait: true, until: deadline };

    return { fail: "lobby timeout" };
  };
}

export const lobbyStrategies = {
  shared: sharedLobby,
  individual: individualLobby,
} as const;

/**
 * Parse a duration string like "30s", "5m", "2h" into ms. Accepts integers
 * for ms when no suffix is present. Throws on parse failure.
 */
export function parseDuration(s: string): number {
  const m = s.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/i);
  if (!m) throw new RangeError(`invalid duration: ${JSON.stringify(s)}`);
  const n = Number(m[1]);
  switch ((m[2] ?? "ms").toLowerCase()) {
    case "ms":
      return Math.round(n);
    case "s":
      return Math.round(n * 1_000);
    case "m":
      return Math.round(n * 60_000);
    case "h":
      return Math.round(n * 3_600_000);
    case "d":
      return Math.round(n * 86_400_000);
    /* c8 ignore next 2 */
    default:
      throw new RangeError(`invalid duration: ${JSON.stringify(s)}`);
  }
}

export { type LobbyConfig, type LobbyContext, type LobbyDecision, type LobbyFn };
