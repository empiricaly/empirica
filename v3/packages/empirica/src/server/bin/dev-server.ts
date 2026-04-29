#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { createEmpirica } from "../empirica.js";
import { hashDevPassword } from "../http/app.js";
import { defineCallbacks } from "../callbacks/hooks.js";

// Dev server: a tiny entrypoint used by playwright e2e and by `pnpm dev`.
//
// Real users get a richer entrypoint via `empirica` CLI in their project.

async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 4321);
  const host = process.env.HOST ?? "127.0.0.1";

  const e = await createEmpirica({
    dbPath: process.env.E2E_DB ?? ":memory:",
    participantSecret: process.env.PARTICIPANT_SECRET ?? "x".repeat(32),
    admin: {
      kind: "dev",
      secret:
        process.env.ADMIN_SECRET ??
        "this-is-a-very-long-dev-only-secret-please-replace",
      users: [
        {
          username: "admin",
          passwordHash: await hashDevPassword(
            process.env.ADMIN_PASSWORD ?? "admin",
          ),
          email: "admin@example.com",
        },
      ],
    },
    hooks: defineCallbacks((on) => {
      on.gameCreated(({ game }) => {
        game.addStage({ name: "demo", durationMs: 30_000 });
      });
    }),
    logger: { level: process.env.LOG_LEVEL as never, pretty: true },
  });

  // Wire WS for live state.
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app: e.app });
  e.app.get("/ws", upgradeWebSocket(() => ({
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
  })));

  const server = serve({ fetch: e.app.fetch, hostname: host, port });
  injectWebSocket(server as never);

  e.logger.info(`empirica dev server`, { url: `http://${host}:${port}` });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("dev server failed:", err);
  process.exit(1);
});
