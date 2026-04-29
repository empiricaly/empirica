import { beforeEach, describe, expect, it } from "vitest";
import { FakeClock } from "../../testing/fake-clock.js";
import { HmacSigner } from "../auth/hmac.js";
import { DevProvider } from "../auth/dev-provider.js";
import { LocalSecretVerifier } from "../auth/jwt.js";
import { Runtime } from "../callbacks/runtime.js";
import { defineCallbacks } from "../callbacks/hooks.js";
import { openMemoryDb, type Db } from "../db/db.js";
import { createLogger } from "../logger.js";
import { createApp, hashDevPassword } from "./app.js";

const SECRET = "0123456789abcdef0123456789abcdef0123456789";

async function setup() {
  const db: Db = openMemoryDb();
  const clock = new FakeClock(1_700_000_000_000);
  const hooks = defineCallbacks(() => {});
  const runtime = new Runtime({
    db,
    hooks,
    clock,
    logger: createLogger({ sink: () => {} }),
  });
  const signer = new HmacSigner(SECRET);
  const dev = new DevProvider({ secret: SECRET });
  const verifier = new LocalSecretVerifier({ secret: SECRET });

  const passwordHash = await hashDevPassword("hunter2");
  const app = createApp({
    runtime,
    adminVerifier: verifier,
    participantSigner: signer,
    devProvider: dev,
    devUsers: [{ username: "admin", passwordHash, email: "a@b.com" }],
  });

  async function login(): Promise<string> {
    const res = await app.request("/api/auth/dev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "hunter2" }),
    });
    expect(res.status).toBe(200);
    const j = (await res.json()) as { token: string };
    return j.token;
  }

  return { db, clock, runtime, signer, app, login };
}

describe("HTTP API", () => {
  it("GET /health is public and returns ok", async () => {
    const { app } = await setup();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("GET /api/admin/batches without auth → 401", async () => {
    const { app } = await setup();
    const res = await app.request("/api/admin/batches");
    expect(res.status).toBe(401);
  });

  it("dev login then GET /api/admin/batches → 200", async () => {
    const { app, login } = await setup();
    const token = await login();
    const res = await app.request("/api/admin/batches", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ batches: [] });
  });

  it("dev login with wrong password → 401", async () => {
    const { app } = await setup();
    const res = await app.request("/api/auth/dev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrong" }),
    });
    expect(res.status).toBe(401);
  });

  it("create treatment → use it in batch → start → game appears", async () => {
    const { app, login } = await setup();
    const token = await login();
    const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };

    const tres = await app.request("/api/admin/treatments", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "solo", factors: { playerCount: 1 } }),
    });
    expect(tres.status).toBe(201);
    const tjson = (await tres.json()) as { id: string };

    const bres = await app.request("/api/admin/batches", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "B1",
        slots: [{ treatmentId: tjson.id, count: 2 }],
      }),
    });
    expect(bres.status).toBe(201);
    const batch = (await bres.json()) as { id: string; status: string };
    expect(batch.status).toBe("created");

    const sres = await app.request(`/api/admin/batches/${batch.id}/start`, {
      method: "POST",
      headers: auth,
    });
    expect(sres.status).toBe(200);
    expect((await sres.json()) as { status: string }).toMatchObject({
      status: "running",
    });

    const gres = await app.request(`/api/admin/batches/${batch.id}/games`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const gjson = (await gres.json()) as { games: { id: string }[] };
    expect(gjson.games).toHaveLength(2);
  });

  it("invalid treatment payload → 400 with field error", async () => {
    const { app, login } = await setup();
    const token = await login();
    const res = await app.request("/api/admin/treatments", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ /* missing name */ factors: {} }),
    });
    expect(res.status).toBe(400);
  });

  it("creating a participant returns a usable HMAC token", async () => {
    const { app, login } = await setup();
    const token = await login();
    const res = await app.request("/api/admin/participants", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ identifier: "prolific:abc" }),
    });
    expect(res.status).toBe(200);
    const j = (await res.json()) as { token: string; participant: { id: string } };
    expect(j.token).toMatch(/^v1\..+\..+$/);
    expect(j.participant.id).toMatch(/^[0-9a-zA-Z_-]{21}$/);
  });

  it("/api/me without participant token → 401", async () => {
    const { app } = await setup();
    const res = await app.request("/api/me");
    expect(res.status).toBe(401);
  });

  it("/api/me with participant token returns the participant + creates a player", async () => {
    const { app, login, runtime } = await setup();
    const token = await login();

    const res = await app.request("/api/admin/participants", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ identifier: "prolific:p1" }),
    });
    const j = (await res.json()) as { token: string; participant: { id: string } };

    const meRes = await app.request("/api/me", {
      headers: { "x-empirica-token": j.token },
    });
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { player: { id: string } };
    expect(me.player.id).toMatch(/^[0-9a-zA-Z_-]{21}$/);

    // Player exists in db.
    expect(runtime.repo.player(me.player.id as never)).toBeDefined();
  });

  it("openapi.json contains the major endpoints", async () => {
    const { app } = await setup();
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { paths: Record<string, unknown> };
    expect(doc.paths).toHaveProperty("/health");
    expect(doc.paths).toHaveProperty("/api/admin/batches");
    expect(doc.paths).toHaveProperty("/api/admin/batches/{id}/start");
    expect(doc.paths).toHaveProperty("/api/admin/treatments");
    expect(doc.paths).toHaveProperty("/api/me");
  });
});
