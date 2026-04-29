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
    // Lobby-game template: a lobby stage waits for N players, then plays.
    on.gameCreated(({ game }) => {
      game.addStage({ name: "lobby", durationMs: 60_000, kind: "lobby" });
      const round = game.addRound({ name: "round 1" });
      round.addStage({ name: "guess", durationMs: 30_000 });
      round.addStage({ name: "results", durationMs: 15_000 });
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
