import { describe, expect, it, vi } from "vitest";
import { EmpiricaClient } from "./client.js";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Record<string, ((evt: any) => void)[]> = {};
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  addEventListener(t: string, fn: (evt: unknown) => void): void {
    (this.listeners[t] ??= []).push(fn);
  }
  emit(t: string, evt: unknown): void {
    for (const fn of this.listeners[t] ?? []) fn(evt);
  }
  close(): void {
    this.emit("close", {});
  }
}

describe("EmpiricaClient", () => {
  it("connects on .connect() and applies received events", () => {
    FakeWebSocket.instances = [];
    const client = new EmpiricaClient({
      baseUrl: "http://localhost",
      token: "v1.x.y",
      webSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
    });

    client.connect();
    expect(FakeWebSocket.instances).toHaveLength(1);

    const ws = FakeWebSocket.instances[0]!;
    ws.emit("open", {});
    ws.emit("message", {
      data: JSON.stringify({
        type: "event",
        event: {
          seq: 1,
          op: "set",
          scope: { kind: "player", id: "p1" },
          key: "x",
          value: 42,
          at: 0,
        },
      }),
    });

    expect(client.snapshot().state["player"]?.["p1"]?.["x"]).toBe(42);
  });

  it("WebSocket URL includes token and reflects baseUrl protocol", () => {
    FakeWebSocket.instances = [];
    const client = new EmpiricaClient({
      baseUrl: "https://example.com",
      token: "v1.x.y",
      webSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
    });
    client.connect();
    const url = new URL(FakeWebSocket.instances[0]!.url);
    expect(url.protocol).toBe("wss:");
    expect(url.pathname).toBe("/ws");
    expect(url.searchParams.get("p")).toBe("v1.x.y");
  });

  it("auto-reconnects on close with exponential backoff", () => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    const client = new EmpiricaClient({
      baseUrl: "http://h",
      token: "v1.x.y",
      webSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
      reconnectBaseMs: 100,
    });
    client.connect();
    FakeWebSocket.instances[0]!.close();

    vi.advanceTimersByTime(100);
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.instances[1]!.close();
    vi.advanceTimersByTime(200);
    expect(FakeWebSocket.instances).toHaveLength(3);

    vi.useRealTimers();
  });

  it("disconnect halts reconnect", () => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    const client = new EmpiricaClient({
      baseUrl: "http://h",
      token: "v1.x.y",
      webSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
      reconnectBaseMs: 100,
    });
    client.connect();
    FakeWebSocket.instances[0]!.close();
    client.disconnect();

    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.useRealTimers();
  });

  it("setPlayerState POSTs to /api/me/state with token", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const client = new EmpiricaClient({
      baseUrl: "http://h",
      token: "v1.x.y",
      fetch: fetchMock as unknown as typeof fetch,
      webSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
    });
    await client.setPlayerState("foo", 42);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://h/api/me/state");
    expect((init as RequestInit).method).toBe("POST");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["x-empirica-token"]).toBe("v1.x.y");
  });
});
