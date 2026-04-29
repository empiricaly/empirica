import { Hono, type Context as HonoContext } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { Json, JsonObject } from "../../shared/json.js";
import type { Id } from "../../shared/id.js";
import { newId } from "../../shared/id.js";
import type { DevAdmin, DevProvider } from "../auth/dev-provider.js";
import type { JWTVerifier, AdminClaims } from "../auth/jwt.js";
import type { HmacSigner, ParticipantTokenPayload } from "../auth/hmac.js";
import type { Runtime } from "../callbacks/runtime.js";
import type { Logger } from "../logger.js";

// Variables we set on Hono contexts. Strongly typed so c.set/c.get
// don't degrade to `never`.
type Vars = {
  Variables: {
    admin?: AdminClaims;
    participantToken?: ParticipantTokenPayload;
  };
};
import {
  CreateBatchSchema,
  CreateParticipantSchema,
  DevLoginSchema,
  SetStateSchema,
  TreatmentInputSchema,
  openapiDocument,
} from "./openapi.js";

// HTTP API
//
// One Hono app, two zones:
//   /api/*    — REST endpoints. Admin endpoints require a verified JWT;
//               player endpoints require a verified HMAC token.
//   /health   — public.
//
// Endpoints follow the Google AIP convention for non-CRUD actions:
// `POST /api/batches/{id}:start`. Hono's path matcher allows ":" in route
// patterns when escaped.

export interface AppOptions {
  runtime: Runtime;
  /** Required for admin auth. */
  adminVerifier: JWTVerifier;
  /** Required for player auth (HMAC URL tokens). */
  participantSigner: HmacSigner;
  /** Optional dev provider — when set, /api/auth/dev is enabled. */
  devProvider?: DevProvider;
  /**
   * Lookup function for the dev provider's user list. Required when
   * `devProvider` is set. Return null on unknown user. The runtime hashes
   * the password externally and compares; this lookup is plaintext-free.
   */
  devUsers?: ReadonlyArray<DevAdmin>;
  /** Optional logger. */
  logger?: Logger;
}

export function createApp(opts: AppOptions): Hono {
  const app = new Hono<Vars>();
  const log = opts.logger;

  // ── public ───────────────────────────────────────────────────────────────
  app.get("/health", (c) => c.json({ ok: true, version: "0.0.0" }));
  app.get("/openapi.json", (c) => c.json(openapiDocument()));

  if (opts.devProvider && opts.devUsers) {
    app.post("/api/auth/dev", async (c) => {
      const body = await jsonBody(c, DevLoginSchema);
      const user = opts.devUsers!.find((u) => u.username === body.username);
      if (!user || !(await verifyDevPassword(user.passwordHash, body.password))) {
        throw new HTTPException(401, { message: "invalid credentials" });
      }
      const token = await opts.devProvider!.signFor({
        username: user.username,
        ...(user.email !== undefined && { email: user.email }),
        ...(user.displayName !== undefined && { displayName: user.displayName }),
      });
      return c.json({ token });
    });
  }

  // ── admin zone ───────────────────────────────────────────────────────────
  const admin = new Hono<Vars>();
  admin.use("*", async (c, next) => {
    const auth = c.req.header("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) throw new HTTPException(401, { message: "missing bearer" });
    try {
      const claims = await opts.adminVerifier.verify(m[1]!);
      c.set("admin", claims);
    } catch (e) {
      log?.warn("admin auth failed", { err: String(e) });
      throw new HTTPException(401, { message: "invalid token" });
    }
    return next();
  });

  admin.get("/treatments", (c) => {
    const treatments = opts.runtime.db.$sqlite
      .prepare(
        `SELECT id, name, factors_json, version, archived_at FROM treatments ORDER BY name, version`,
      )
      .all() as {
      id: string;
      name: string;
      factors_json: string;
      version: number;
      archived_at: number | null;
    }[];
    return c.json({
      treatments: treatments.map((t) => ({
        id: t.id,
        name: t.name,
        factors: JSON.parse(t.factors_json),
        version: t.version,
        archived: t.archived_at !== null,
      })),
    });
  });

  admin.post("/treatments", async (c) => {
    const body = await jsonBody(c, TreatmentInputSchema);
    const id = newId<"treatment">();
    const factors = JSON.stringify(body.factors);
    opts.runtime.db.$sqlite
      .prepare(
        `INSERT INTO treatments(id, name, factors_json, version) VALUES (?, ?, ?, 1)`,
      )
      .run(id, body.name, factors);
    return c.json({ id, name: body.name, factors: body.factors }, 201);
  });

  admin.get("/batches", (c) => {
    const list = opts.runtime.repo.listBatches();
    return c.json({ batches: list.map(serialiseBatch) });
  });

  admin.post("/batches", async (c) => {
    const body = await jsonBody(c, CreateBatchSchema);
    const treatments = opts.runtime.db.$sqlite
      .prepare(`SELECT id, name, factors_json FROM treatments WHERE id = ?`);
    const slots: { treatment: JsonObject; treatmentName: string; count: number }[] = [];
    for (const slot of body.slots) {
      const t = treatments.get(slot.treatmentId) as
        | { id: string; name: string; factors_json: string }
        | undefined;
      if (!t) throw new HTTPException(400, { message: `unknown treatment ${slot.treatmentId}` });
      slots.push({
        treatment: JSON.parse(t.factors_json) as JsonObject,
        treatmentName: t.name,
        count: slot.count,
      });
    }

    const config: JsonObject = { slots: body.slots as unknown as Json };
    const args: Parameters<typeof opts.runtime.repo.createBatch>[0] = { config };
    if (body.lobbyConfig !== undefined) args.lobbyConfig = body.lobbyConfig as JsonObject;
    if (body.name !== undefined) args.name = body.name;
    const batch = opts.runtime.repo.createBatch(args);
    // Stash slots so :start can use them without re-fetching treatments.
    (batch.config as JsonObject).__resolvedSlots = slots as unknown as Json;
    opts.runtime.db.$sqlite
      .prepare(`UPDATE batches SET config_json = ? WHERE id = ?`)
      .run(JSON.stringify(batch.config), batch.id);

    return c.json(serialiseBatch(batch), 201);
  });

  admin.get("/batches/:id", (c) => {
    const batch = opts.runtime.repo.batch(c.req.param("id") as Id<"batch">);
    if (!batch) throw new HTTPException(404, { message: "not found" });
    return c.json(serialiseBatch(batch));
  });

  admin.post("/batches/:id/start", (c) => {
    const id = c.req.param("id") as Id<"batch">;
    const batch = opts.runtime.repo.batch(id);
    if (!batch) throw new HTTPException(404, { message: "not found" });
    const slots = (batch.config["__resolvedSlots"] as unknown as
      | { treatment: JsonObject; treatmentName: string; count: number }[]
      | undefined) ?? [];
    if (slots.length === 0) {
      throw new HTTPException(400, { message: "batch has no slots" });
    }
    opts.runtime.startBatch(id, slots);
    return c.json(serialiseBatch(opts.runtime.repo.batch(id)!));
  });

  admin.post("/batches/:id/end", (c) => {
    const id = c.req.param("id") as Id<"batch">;
    opts.runtime.repo.setBatchStatus(id, "ended", "ended by admin");
    return c.json(serialiseBatch(opts.runtime.repo.batch(id)!));
  });

  admin.get("/batches/:id/games", (c) => {
    const id = c.req.param("id") as Id<"batch">;
    return c.json({
      games: opts.runtime.repo.gamesInBatch(id).map(serialiseGame),
    });
  });

  admin.get("/games/:id", (c) => {
    const id = c.req.param("id") as Id<"game">;
    const game = opts.runtime.repo.game(id);
    if (!game) throw new HTTPException(404, { message: "not found" });
    return c.json(serialiseGame(game));
  });

  admin.post("/games/:id/start", (c) => {
    const id = c.req.param("id") as Id<"game">;
    opts.runtime.startGame(id);
    return c.json(serialiseGame(opts.runtime.repo.game(id)!));
  });

  admin.post("/games/:id/end", (c) => {
    const id = c.req.param("id") as Id<"game">;
    opts.runtime.repo.setGameStatus(id, "ended", "ended by admin");
    return c.json(serialiseGame(opts.runtime.repo.game(id)!));
  });

  admin.get("/games/:id/players", (c) => {
    const id = c.req.param("id") as Id<"game">;
    return c.json({
      players: opts.runtime.repo.playersInGame(id).map(serialisePlayer),
    });
  });

  admin.post("/participants", async (c) => {
    const body = await jsonBody(c, CreateParticipantSchema);
    const meta: JsonObject | undefined = body.metadata as JsonObject | undefined;
    const args: Parameters<typeof opts.runtime.repo.upsertParticipant>[0] = {
      identifier: body.identifier,
    };
    if (meta !== undefined) args.metadata = meta;
    const participant = opts.runtime.repo.upsertParticipant(args);

    const ttl = body.ttlMs ?? 6 * 60 * 60 * 1000;
    const issueArgs: Parameters<typeof opts.participantSigner.issue>[0] = {
      participantId: participant.id,
      expiresAt: opts.runtime.clock.now() + ttl,
    };
    if (body.batchId !== undefined) issueArgs.batchId = body.batchId as Id<"batch">;
    const token = opts.participantSigner.issue(issueArgs);
    return c.json({ participant: { id: participant.id, identifier: participant.identifier }, token });
  });

  app.route("/api/admin", admin);

  // ── player zone (HMAC tokens) ────────────────────────────────────────────
  const player = new Hono<Vars>();
  player.use("*", async (c, next) => {
    const tok =
      c.req.header("x-empirica-token") ??
      new URL(c.req.url).searchParams.get("p") ??
      "";
    if (!tok) throw new HTTPException(401, { message: "missing token" });
    const r = opts.participantSigner.verify(tok, opts.runtime.clock.now());
    if (!r.ok) throw new HTTPException(401, { message: r.reason });
    c.set("participantToken", r.payload);
    return next();
  });

  player.get("/", (c) => {
    const tok = c.get("participantToken")!;
    const participant = opts.runtime.repo.participant(tok.participantId);
    if (!participant) throw new HTTPException(404, { message: "no such participant" });

    // Find this participant's currently active player row, if any.
    const playerRow = opts.runtime.db.$sqlite
      .prepare(
        `SELECT * FROM players WHERE participant_id = ? ORDER BY created_at DESC LIMIT 1`,
      )
      .get(tok.participantId) as
      | { id: string; game_id: string | null; status: string }
      | undefined;

    let pid: Id<"player">;
    if (playerRow) {
      pid = playerRow.id as Id<"player">;
    } else {
      const args: Parameters<typeof opts.runtime.repo.createPlayer>[0] = {
        participantId: participant.id,
      };
      if (tok.batchId !== undefined) args.batchId = tok.batchId;
      const created = opts.runtime.repo.createPlayer(args);
      pid = created.id;
      // Try to assign immediately.
      opts.runtime.assign(pid);
    }
    const fresh = opts.runtime.repo.player(pid)!;
    const view = serialisePlayer(fresh);
    const game = fresh.gameId ? opts.runtime.repo.game(fresh.gameId) : null;
    return c.json({
      participant: { id: participant.id, identifier: participant.identifier },
      player: view,
      game: game ? serialiseGame(game) : null,
    });
  });

  player.post("/state", async (c) => {
    const tok = c.get("participantToken")!;
    const playerRow = opts.runtime.db.$sqlite
      .prepare(
        `SELECT id, game_id FROM players WHERE participant_id = ? ORDER BY created_at DESC LIMIT 1`,
      )
      .get(tok.participantId) as { id: string; game_id: string | null } | undefined;
    if (!playerRow) throw new HTTPException(404, { message: "no player" });

    const body = await jsonBody(c, SetStateSchema);
    let scopeId: string;
    switch (body.scope) {
      case "player":
        scopeId = playerRow.id;
        break;
      case "playerStage":
      case "playerRound":
        scopeId = `${playerRow.id}:${body.scopeId}`;
        break;
      case "game":
        if (!playerRow.game_id) throw new HTTPException(400, { message: "no game" });
        if (playerRow.game_id !== body.scopeId) {
          throw new HTTPException(403, { message: "wrong game" });
        }
        scopeId = playerRow.game_id;
        break;
    }
    opts.runtime.store.set(
      { kind: body.scope, id: scopeId },
      body.key,
      body.value as Json,
      {
        ...(body.immutable !== undefined && { immutable: body.immutable }),
        ...(body.private !== undefined && { private: body.private }),
        by: `player:${playerRow.id}`,
      },
    );
    return c.json({ ok: true });
  });

  app.route("/api/me", player);

  // ── error handler ────────────────────────────────────────────────────────
  app.onError((err, c) => {
    if (err instanceof HTTPException) return err.getResponse();
    log?.error("uncaught error", { err: String(err) });
    return c.json({ error: "internal" }, 500);
  });

  return app as unknown as Hono;
}

// ── helpers ───────────────────────────────────────────────────────────────

async function jsonBody<T extends z.ZodTypeAny>(
  c: HonoContext<Vars>,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "invalid json" });
  }
  const r = schema.safeParse(raw);
  if (!r.success) {
    throw new HTTPException(400, {
      message: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
    });
  }
  return r.data;
}

async function verifyDevPassword(stored: string, supplied: string): Promise<boolean> {
  // Dev provider: stored is a hex-encoded sha256(salt + password) with the
  // 16-byte salt prepended as 32 hex chars. We avoid pulling in bcrypt to
  // keep the runtime dependency-light. This is acceptable for *dev*; admins
  // running production should use the IdP path.
  const m = stored.match(/^([0-9a-f]{32})\$([0-9a-f]{64})$/i);
  if (!m) return false;
  const salt = Buffer.from(m[1]!, "hex");
  const expected = m[2]!.toLowerCase();
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const got = createHash("sha256")
    .update(salt)
    .update(Buffer.from(supplied, "utf8"))
    .digest("hex");
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(expected, "hex"));
}

export async function hashDevPassword(plain: string): Promise<string> {
  const { randomBytes, createHash } = await import("node:crypto");
  const salt = randomBytes(16);
  const hash = createHash("sha256")
    .update(salt)
    .update(Buffer.from(plain, "utf8"))
    .digest("hex");
  return `${salt.toString("hex")}$${hash}`;
}

function serialiseBatch(b: ReturnType<Runtime["repo"]["batch"]> & object): JsonObject {
  return {
    id: b.id,
    status: b.status,
    name: b.name,
    config: omitInternal(b.config),
    lobbyConfig: b.lobbyConfig,
    createdAt: b.createdAt,
    startedAt: b.startedAt,
    endedAt: b.endedAt,
    endedReason: b.endedReason,
  };
}

function serialiseGame(g: NonNullable<ReturnType<Runtime["repo"]["game"]>>): JsonObject {
  return {
    id: g.id,
    batchId: g.batchId,
    status: g.status,
    treatment: g.treatment,
    treatmentName: g.treatmentName,
    currentStageId: g.currentStageId,
    createdAt: g.createdAt,
    startedAt: g.startedAt,
    endedAt: g.endedAt,
    endedReason: g.endedReason,
  };
}

function serialisePlayer(p: NonNullable<ReturnType<Runtime["repo"]["player"]>>): JsonObject {
  return {
    id: p.id,
    gameId: p.gameId,
    batchId: p.batchId,
    participantId: p.participantId,
    status: p.status,
    endedReason: p.endedReason,
    createdAt: p.createdAt,
    endedAt: p.endedAt,
  };
}

function omitInternal<T extends JsonObject>(obj: T): JsonObject {
  const out: JsonObject = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("__")) continue;
    out[k] = v as Json;
  }
  return out;
}

export type { AdminClaims, ParticipantTokenPayload };
