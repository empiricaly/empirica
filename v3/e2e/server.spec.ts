import { expect, test } from "@playwright/test";

// Smoke e2e test against the dev-server entrypoint. The webServer config in
// playwright.config.ts boots `pnpm -F empirica run e2e:server` with an
// in-memory DB and a fixed admin password.

test.describe("dev server", () => {
  test("GET /health returns ok", async ({ request }) => {
    const res = await request.get("/health");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("admin login → create treatment → create + start batch", async ({ request }) => {
    const login = await request.post("/api/auth/dev", {
      data: { username: "admin", password: "admin" },
    });
    expect(login.status()).toBe(200);
    const { token } = (await login.json()) as { token: string };

    const tres = await request.post("/api/admin/treatments", {
      headers: { authorization: `Bearer ${token}` },
      data: { name: "solo", factors: { playerCount: 1 } },
    });
    expect(tres.status()).toBe(201);
    const treatment = (await tres.json()) as { id: string };

    const bres = await request.post("/api/admin/batches", {
      headers: { authorization: `Bearer ${token}` },
      data: { slots: [{ treatmentId: treatment.id, count: 1 }] },
    });
    expect(bres.status()).toBe(201);
    const batch = (await bres.json()) as { id: string };

    const sres = await request.post(`/api/admin/batches/${batch.id}/start`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(sres.status()).toBe(200);

    const games = await request.get(`/api/admin/batches/${batch.id}/games`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(games.status()).toBe(200);
    const j = (await games.json()) as { games: Array<{ id: string; status: string }> };
    expect(j.games).toHaveLength(1);
  });

  test("issue participant token and call /api/me", async ({ request }) => {
    const login = await request.post("/api/auth/dev", {
      data: { username: "admin", password: "admin" },
    });
    const { token } = (await login.json()) as { token: string };

    const pres = await request.post("/api/admin/participants", {
      headers: { authorization: `Bearer ${token}` },
      data: { identifier: "p1" },
    });
    expect(pres.status()).toBe(200);
    const { token: ptoken } = (await pres.json()) as { token: string };

    const me = await request.get("/api/me", {
      headers: { "x-empirica-token": ptoken },
    });
    expect(me.status()).toBe(200);
    const meJson = (await me.json()) as { player: { id: string } };
    expect(meJson.player.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });
});
