import type { Json } from "../shared/json.js";
import type { WireEvent, WireMessage } from "../server/ws/broadcaster.js";
import { ClientStore, type Snapshot, type Subscriber, type Unsubscribe } from "./store.js";

// EmpiricaClient
//
// Connects to the server over WS, mirrors live state into a ClientStore,
// and exposes high-level methods for player actions (set state, get
// snapshot). Auto-reconnects with exponential backoff. Replays missed
// events on reconnect using `since` cursor.

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

export interface EmpiricaClientOptions {
  /** Base URL like "https://example.com". */
  baseUrl: string;
  /** HMAC participant token (?p=...). */
  token: string;
  /**
   * Override WebSocket constructor (tests). Defaults to `globalThis.WebSocket`.
   */
  webSocketCtor?: typeof WebSocket;
  /** Override fetch (tests). Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** Reconnect backoff base ms. Default 500. */
  reconnectBaseMs?: number;
  /** Reconnect backoff cap ms. Default 30_000. */
  reconnectCapMs?: number;
}

export class EmpiricaClient {
  readonly store = new ClientStore();
  private ws: WebSocket | null = null;
  private state: ConnectionState = "idle";
  private listeners = new Set<(s: ConnectionState) => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private closed = false;

  constructor(private readonly opts: EmpiricaClientOptions) {}

  // ── lifecycle ──────────────────────────────────────────────────────────

  connect(): void {
    if (this.state === "open" || this.state === "connecting") return;
    this.closed = false;
    this.openSocket();
  }

  disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.setState("closed");
  }

  onConnectionChange(fn: (s: ConnectionState) => void): Unsubscribe {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  // ── data access ────────────────────────────────────────────────────────

  subscribe(fn: Subscriber): Unsubscribe {
    return this.store.subscribe(fn);
  }

  snapshot(): Snapshot {
    return this.store.get();
  }

  /** Set a key on the current player's scope. */
  async setPlayerState(key: string, value: Json): Promise<void> {
    await this.postState({ scope: "player", scopeId: "self", key, value });
  }

  /** Set a key on a (player, stage) scope. */
  async setStageData(stageId: string, key: string, value: Json): Promise<void> {
    await this.postState({ scope: "playerStage", scopeId: stageId, key, value });
  }

  /** Set a key on a (player, round) scope. */
  async setRoundData(roundId: string, key: string, value: Json): Promise<void> {
    await this.postState({ scope: "playerRound", scopeId: roundId, key, value });
  }

  // ── REST helpers ───────────────────────────────────────────────────────

  async getMe(): Promise<{ player: { id: string; gameId: string | null } | null }> {
    const fetchImpl = this.opts.fetch ?? fetch;
    const res = await fetchImpl(`${this.opts.baseUrl}/api/me`, {
      headers: { "x-empirica-token": this.opts.token },
    });
    if (!res.ok) throw new Error(`GET /api/me: ${res.status}`);
    return (await res.json()) as { player: { id: string; gameId: string | null } | null };
  }

  private async postState(body: {
    scope: "player" | "playerStage" | "playerRound" | "game";
    scopeId: string;
    key: string;
    value: Json;
  }): Promise<void> {
    const fetchImpl = this.opts.fetch ?? fetch;
    const res = await fetchImpl(`${this.opts.baseUrl}/api/me/state`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-empirica-token": this.opts.token,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST /api/me/state: ${res.status}`);
  }

  // ── socket ─────────────────────────────────────────────────────────────

  private openSocket(): void {
    this.setState("connecting");
    const Ctor = this.opts.webSocketCtor ?? globalThis.WebSocket;
    if (!Ctor) throw new Error("no WebSocket implementation available");

    const url = wsUrl(this.opts.baseUrl, this.opts.token, this.store.get().seq);
    const ws = new Ctor(url);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.setState("open");
    });
    ws.addEventListener("message", (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(String(evt.data)) as WireMessage;
        if (msg.type === "event") this.applyEvent(msg.event);
      } catch {
        /* ignore malformed */
      }
    });
    ws.addEventListener("close", () => {
      this.setState("closed");
      if (!this.closed) this.scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    });
  }

  private applyEvent(e: WireEvent): void {
    this.store.apply(e);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const base = this.opts.reconnectBaseMs ?? 500;
    const cap = this.opts.reconnectCapMs ?? 30_000;
    const delay = Math.min(cap, base * 2 ** this.reconnectAttempts);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      if (this.closed) return;
      this.openSocket();
    }, delay);
  }

  private setState(s: ConnectionState): void {
    if (s === this.state) return;
    this.state = s;
    for (const fn of this.listeners) fn(s);
  }
}

function wsUrl(baseUrl: string, token: string, since: number): string {
  const u = new URL(baseUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = u.pathname.replace(/\/$/, "") + "/ws";
  u.searchParams.set("p", token);
  if (since > 0) u.searchParams.set("since", String(since));
  return u.toString();
}
