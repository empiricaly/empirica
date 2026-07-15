// S2 spike: sealed single-file bundle — embedded static assets + bun:sqlite + WS.
//
// Assets are embedded via `with { type: "file" }` imports. Under `bun build
// --compile` each import resolves to a path inside the executable's virtual
// filesystem (/$bunfs/root/... on Linux/macOS, B:/~BUN/root/... on Windows);
// Bun.file(thatPath) reads the embedded bytes. When run un-compiled
// (`bun index.ts`) the same imports resolve to the real on-disk paths, so the
// code works identically in dev and sealed modes.

import { Database } from "bun:sqlite";
import { join } from "node:path";

import indexHtmlPath from "./assets/index.html" with { type: "file" };
import appJsPath from "./assets/app.js" with { type: "file" };
import logoPngPath from "./assets/logo.png" with { type: "file" };

// --- sqlite: DB file lives in the *runtime* CWD, never embedded -------------
const dbPath = join(process.cwd(), "s2-state.sqlite");
const db = new Database(dbPath, { create: true });
db.run(`CREATE TABLE IF NOT EXISTS state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
const getAll = db.query(`SELECT key, value, updated_at FROM state ORDER BY key`);
const upsert = db.query(
  `INSERT INTO state (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
   ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')`,
);

// --- server ------------------------------------------------------------------
const port = Number(process.env.PORT ?? 4270);

const server = Bun.serve({
  port,
  routes: {
    "/": () => new Response(Bun.file(indexHtmlPath), {
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
    "/app.js": () => new Response(Bun.file(appJsPath), {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    }),
    "/logo.png": () => new Response(Bun.file(logoPngPath), {
      headers: { "content-type": "image/png" },
    }),
    "/api/state": {
      GET: () => Response.json({
        compiled: !!process.execArgv, // placeholder; real check below in /api/meta
        rows: getAll.all(),
      }),
      POST: async (req) => {
        const body = (await req.json()) as { key?: string; value?: string };
        if (!body.key || typeof body.value !== "string") {
          return Response.json({ error: "expected { key, value }" }, { status: 400 });
        }
        upsert.run(body.key, body.value);
        return Response.json({ ok: true, rows: getAll.all() });
      },
    },
    // Introspection: what does the sealed binary know about itself?
    "/api/meta": () => Response.json({
      execPath: process.execPath,
      cwd: process.cwd(),
      dbPath,
      isCompiled: !!(Bun as any).embeddedFiles?.length || process.execPath !== Bun.which("bun"),
      embeddedFiles: ((Bun as any).embeddedFiles ?? []).map((f: File) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
      importPaths: { indexHtmlPath, appJsPath, logoPngPath },
    }),
  },
  fetch(req, srv) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      if (srv.upgrade(req)) return undefined as unknown as Response;
      return new Response("upgrade failed", { status: 400 });
    }
    return new Response("not found", { status: 404 });
  },
  websocket: {
    message(ws, message) {
      ws.send(`echo:${message}`);
    },
  },
});

console.log(`s2 sealed-bundle server on http://localhost:${server.port} (db: ${dbPath})`);
