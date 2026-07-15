// @empirica/engine — implementation begins after its package spec
// (design/packages/engine.md) is reviewed. See design/15-development-plan.md.
export const PACKAGE = "@empirica/engine" as const;
export type { SqliteDriver, SqliteStmt, SqliteTxn, PlatformSocket, PublishResult } from "./platform/seam.ts";
