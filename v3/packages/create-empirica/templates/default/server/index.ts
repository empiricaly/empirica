import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { createEmpirica, defineCallbacks, hashDevPassword } from "empirica/server";

const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? "127.0.0.1";

const e = await createEmpirica({
  dbPath: process.env.EMPIRICA_DB ?? "./data/empirica.db",
  participantSecret:
    process.env.PARTICIPANT_SECRET ?? "dev-only-replace-this-secret-please-32",
  admin: {
    kind: "dev",
    secret:
      process.env.ADMIN_SECRET ?? "dev-only-replace-this-admin-secret-please-32",
    users: [
      {
        username: "admin",
        passwordHash: await hashDevPassword(process.env.ADMIN_PASSWORD ?? "admin"),
      },
    ],
  },
  hooks: defineCallbacks((on) => {
    // Default template: intro → 2-round game → exit, multi-player by default.
    on.gameCreated(({ game }) => {
      game.addStage({ name: "intro", durationMs: 30_000 });
      const r1 = game.addRound({ name: "round 1" });
      r1.addStage({ name: "guess", durationMs: 30_000 });
      r1.addStage({ name: "result", durationMs: 15_000 });
      const r2 = game.addRound({ name: "round 2" });
      r2.addStage({ name: "guess", durationMs: 30_000 });
      r2.addStage({ name: "result", durationMs: 15_000 });
      game.addStage({ name: "exit", durationMs: 60_000 });
    });
  }),
  logger: { level: "info", pretty: true },
});

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app: e.app });
e.app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_evt, ws) {
      const remove = e.broadcaster.add({
        scopes: [],
        forAdmin: true,
        send: (m) => {
          try {
            ws.send(JSON.stringify(m));
          } catch {
            /* socket closed */
          }
        },
      });
      ws.raw?.addEventListener?.("close", () => remove());
    },
    onClose() {},
  })),
);

const server = serve({ fetch: e.app.fetch, hostname: host, port });
injectWebSocket(server as never);

e.logger.info("server up", { url: `http://${host}:${port}` });
