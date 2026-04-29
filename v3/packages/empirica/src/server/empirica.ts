import { Hono } from "hono";
import type { Clock } from "../shared/clock.js";
import { SystemClock } from "../shared/clock.js";
import { DevProvider, type DevAdmin } from "./auth/dev-provider.js";
import { HmacSigner } from "./auth/hmac.js";
import { JWKSVerifier, LocalSecretVerifier, type JWTVerifier } from "./auth/jwt.js";
import { HookRegistry } from "./callbacks/hooks.js";
import { Runtime } from "./callbacks/runtime.js";
import { openDb, type Db } from "./db/db.js";
import { createApp, hashDevPassword } from "./http/app.js";
import { createLogger, type Logger, type LoggerConfig } from "./logger.js";
import type { AssignmentFn } from "./strategies/assignment.js";
import { Broadcaster } from "./ws/broadcaster.js";

// Top-level entrypoint for users who don't want to assemble parts manually.
// Returns an object with the wired Hono app plus references to the runtime
// pieces, suitable for serving via @hono/node-server or any other adapter.

export interface EmpiricaOptions {
  /** Path to the SQLite file. ":memory:" for in-memory. Default `./data/empirica.db`. */
  dbPath?: string;
  /**
   * HMAC secret for participant tokens. Required. Min 16 bytes. Treat as a
   * production secret; rotating it invalidates outstanding URLs.
   */
  participantSecret: string;
  /**
   * Admin auth configuration:
   *   - `{ kind: "dev", secret, users }` — dev provider
   *   - `{ kind: "jwks", issuer, jwksUrl, audience? }` — production
   *   - `{ kind: "custom", verifier }` — bring your own
   */
  admin: AdminAuthConfig;
  /** Hooks (from `defineCallbacks`). Optional; defaults to no callbacks. */
  hooks?: HookRegistry;
  /** Default `firstAvailable`. */
  assignment?: AssignmentFn;
  /** Logger config or pre-built logger. */
  logger?: Logger | LoggerConfig;
  clock?: Clock;
  /** Deterministic random source (tests). */
  random?: () => number;
}

export type AdminAuthConfig =
  | {
      kind: "dev";
      /** JWT signing secret used by both the dev provider and the verifier. */
      secret: string;
      /** Allowed admin users. */
      users: ReadonlyArray<DevAdmin>;
    }
  | {
      kind: "jwks";
      issuer: string;
      jwksUrl: string;
      audience?: string | string[];
    }
  | { kind: "custom"; verifier: JWTVerifier };

export interface Empirica {
  readonly app: Hono;
  readonly runtime: Runtime;
  readonly db: Db;
  readonly broadcaster: Broadcaster;
  readonly logger: Logger;
  /** Convenience: hash a dev password (for config files / setup scripts). */
  hashDevPassword(plain: string): Promise<string>;
}

export async function createEmpirica(opts: EmpiricaOptions): Promise<Empirica> {
  const logger =
    opts.logger && "info" in opts.logger ? opts.logger : createLogger(opts.logger ?? {});
  const clock = opts.clock ?? SystemClock;

  const db = openDb({ path: opts.dbPath ?? "./data/empirica.db" });

  const hooks = opts.hooks ?? new HookRegistry();
  const runtime = new Runtime({
    db,
    hooks,
    clock,
    logger,
    ...(opts.assignment !== undefined && { assignment: opts.assignment }),
    ...(opts.random !== undefined && { random: opts.random }),
  });

  const broadcaster = new Broadcaster(runtime.events);
  // The runtime's underlying tx fires events into the log; we hook the db
  // commit by patching the tx method to call notify() afterwards. Doing it
  // here keeps the broadcaster optional from the runtime's POV.
  const originalTx = runtime.tx.bind(runtime);
  runtime.tx = ((by, fn) => {
    const result = originalTx(by, fn);
    broadcaster.notify();
    return result;
  }) as typeof runtime.tx;

  const participantSigner = new HmacSigner(opts.participantSecret);
  const { adminVerifier, devProvider, devUsers } = await wireAdmin(opts.admin);

  const appOpts: Parameters<typeof createApp>[0] = {
    runtime,
    adminVerifier,
    participantSigner,
    logger,
  };
  if (devProvider) appOpts.devProvider = devProvider;
  if (devUsers) appOpts.devUsers = devUsers;
  const app = createApp(appOpts);

  return {
    app,
    runtime,
    db,
    broadcaster,
    logger,
    hashDevPassword,
  };
}

async function wireAdmin(cfg: AdminAuthConfig): Promise<{
  adminVerifier: JWTVerifier;
  devProvider?: DevProvider;
  devUsers?: ReadonlyArray<DevAdmin>;
}> {
  switch (cfg.kind) {
    case "dev": {
      const verifier = new LocalSecretVerifier({ secret: cfg.secret });
      const provider = new DevProvider({ secret: cfg.secret });
      return { adminVerifier: verifier, devProvider: provider, devUsers: cfg.users };
    }
    case "jwks": {
      const args: ConstructorParameters<typeof JWKSVerifier>[0] = {
        issuer: cfg.issuer,
        jwksUrl: cfg.jwksUrl,
      };
      if (cfg.audience !== undefined) args.audience = cfg.audience;
      return { adminVerifier: new JWKSVerifier(args) };
    }
    case "custom":
      return { adminVerifier: cfg.verifier };
  }
}
