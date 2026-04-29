import { describe, expect, it, vi } from "vitest";
import { Api, ApiError } from "./api.js";

describe("Api", () => {
  function mockFetch(handler: (input: RequestInfo, init?: RequestInit) => Response): typeof fetch {
    return vi.fn(async (input: RequestInfo, init?: RequestInit) => handler(input, init)) as unknown as typeof fetch;
  }

  it("devLogin posts and stores the token", async () => {
    const calls: { url: string; body: string }[] = [];
    globalThis.fetch = mockFetch((input, init) => {
      calls.push({ url: String(input), body: String(init?.body) });
      return new Response(JSON.stringify({ token: "abc.def.ghi" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const api = new Api({ token: null });
    const t = await api.devLogin("admin", "hunter2");
    expect(t).toBe("abc.def.ghi");
    expect(calls[0]?.url).toBe("/api/auth/dev");
    expect(JSON.parse(calls[0]!.body)).toEqual({ username: "admin", password: "hunter2" });
  });

  it("listBatches sends the bearer token", async () => {
    const captured: Record<string, string>[] = [];
    globalThis.fetch = mockFetch((_input, init) => {
      captured.push(init?.headers as Record<string, string>);
      return new Response(JSON.stringify({ batches: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const api = new Api({ token: "TOK" });
    await api.listBatches();
    expect(captured[0]?.authorization).toBe("Bearer TOK");
  });

  it("non-2xx responses raise ApiError with status", async () => {
    globalThis.fetch = mockFetch(() => new Response("nope", { status: 401 }));
    const api = new Api({ token: "TOK" });
    await expect(api.listBatches()).rejects.toBeInstanceOf(ApiError);
  });
});
