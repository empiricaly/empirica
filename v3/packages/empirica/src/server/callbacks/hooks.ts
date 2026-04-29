import type { HookEvent, HookHandlers } from "./types.js";

// Hook registry
//
// `defineCallbacks` returns one of these. The runtime calls `fire(event, ...)`
// with the right payload at the right moment, inside the active transaction.
// Handlers are sync; if they throw, the runtime rolls back the tx.

export class HookRegistry {
  private readonly handlers = new Map<HookEvent, Array<HookHandlers[HookEvent]>>();

  on<E extends HookEvent>(event: E, handler: HookHandlers[E]): void {
    const list = (this.handlers.get(event) ?? []) as Array<HookHandlers[HookEvent]>;
    list.push(handler as HookHandlers[HookEvent]);
    this.handlers.set(event, list);
  }

  fire<E extends HookEvent>(event: E, payload: Parameters<HookHandlers[E]>[0]): void {
    const list = this.handlers.get(event);
    if (!list) return;
    for (const handler of list) {
      (handler as (e: Parameters<HookHandlers[E]>[0]) => void)(payload);
    }
  }

  count(event: HookEvent): number {
    return this.handlers.get(event)?.length ?? 0;
  }
}

// User-facing builder. Captured shape matches the v2 spelling but with
// stronger types and a single registry.
export interface OnAPI {
  batchCreated(handler: HookHandlers["batchCreated"]): void;
  batchStarted(handler: HookHandlers["batchStarted"]): void;
  batchEnded(handler: HookHandlers["batchEnded"]): void;
  gameCreated(handler: HookHandlers["gameCreated"]): void;
  gameStart(handler: HookHandlers["gameStarted"]): void;
  gameEnded(handler: HookHandlers["gameEnded"]): void;
  roundStart(handler: HookHandlers["roundStarted"]): void;
  roundEnded(handler: HookHandlers["roundEnded"]): void;
  stageStart(handler: HookHandlers["stageStarted"]): void;
  stageEnded(handler: HookHandlers["stageEnded"]): void;
  playerJoined(handler: HookHandlers["playerJoined"]): void;
  playerAssigned(handler: HookHandlers["playerAssigned"]): void;
  playerExited(handler: HookHandlers["playerExited"]): void;
}

export function defineCallbacks(register: (on: OnAPI) => void): HookRegistry {
  const reg = new HookRegistry();
  const on: OnAPI = {
    batchCreated: (h) => reg.on("batchCreated", h),
    batchStarted: (h) => reg.on("batchStarted", h),
    batchEnded: (h) => reg.on("batchEnded", h),
    gameCreated: (h) => reg.on("gameCreated", h),
    gameStart: (h) => reg.on("gameStarted", h),
    gameEnded: (h) => reg.on("gameEnded", h),
    roundStart: (h) => reg.on("roundStarted", h),
    roundEnded: (h) => reg.on("roundEnded", h),
    stageStart: (h) => reg.on("stageStarted", h),
    stageEnded: (h) => reg.on("stageEnded", h),
    playerJoined: (h) => reg.on("playerJoined", h),
    playerAssigned: (h) => reg.on("playerAssigned", h),
    playerExited: (h) => reg.on("playerExited", h),
  };
  register(on);
  return reg;
}
