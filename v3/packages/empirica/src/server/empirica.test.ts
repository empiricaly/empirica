import { describe, expect, it } from "vitest";
import { createEmpirica } from "./empirica.js";
import { defineCallbacks } from "./callbacks/hooks.js";
import { hashDevPassword } from "./http/app.js";

describe("createEmpirica", () => {
  it("wires up runtime, app, broadcaster against an in-memory DB", async () => {
    const e = await createEmpirica({
      dbPath: ":memory:",
      participantSecret: "x".repeat(32),
      admin: {
        kind: "dev",
        secret: "x".repeat(40),
        users: [
          {
            username: "admin",
            passwordHash: await hashDevPassword("hunter2"),
          },
        ],
      },
      hooks: defineCallbacks(() => {}),
    });

    expect(e.app).toBeDefined();
    expect(e.runtime).toBeDefined();
    expect(e.broadcaster).toBeDefined();

    const res = await e.app.request("/health");
    expect(res.status).toBe(200);
  });

  it("login → create treatment → batch → start → game flow", async () => {
    const e = await createEmpirica({
      dbPath: ":memory:",
      participantSecret: "x".repeat(32),
      admin: {
        kind: "dev",
        secret: "x".repeat(40),
        users: [{ username: "admin", passwordHash: await hashDevPassword("hunter2") }],
      },
      hooks: defineCallbacks((on) => {
        on.gameCreated(({ game }) => {
          game.addStage({ name: "stage1", durationMs: 1_000 });
        });
      }),
    });

    const login = await e.app.request("/api/auth/dev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "hunter2" }),
    });
    expect(login.status).toBe(200);
    const { token } = (await login.json()) as { token: string };
    const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };

    const tres = await e.app.request("/api/admin/treatments", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "solo", factors: { playerCount: 1 } }),
    });
    expect(tres.status).toBe(201);
    const t = (await tres.json()) as { id: string };

    const bres = await e.app.request("/api/admin/batches", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ slots: [{ treatmentId: t.id, count: 1 }] }),
    });
    expect(bres.status).toBe(201);
    const b = (await bres.json()) as { id: string };

    const sres = await e.app.request(`/api/admin/batches/${b.id}/start`, {
      method: "POST",
      headers: auth,
    });
    expect(sres.status).toBe(200);

    const gres = await e.app.request(`/api/admin/batches/${b.id}/games`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const games = (await gres.json()) as { games: { id: string }[] };
    expect(games.games).toHaveLength(1);
  });
});
