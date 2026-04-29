import { beforeEach, describe, expect, it } from "vitest";
import { openMemoryDb, type Db } from "./db.js";
import { Repo } from "./repo.js";

describe("Repo", () => {
  let db: Db;
  let repo: Repo;
  let now: number;

  beforeEach(() => {
    db = openMemoryDb();
    now = 1_000;
    repo = new Repo(db, () => now++);
  });

  it("creates and reads a batch", () => {
    const b = repo.createBatch({ config: { kind: "simple" }, name: "B1" });
    expect(b.status).toBe("created");
    expect(b.config).toEqual({ kind: "simple" });
    expect(b.name).toBe("B1");

    expect(repo.batch(b.id)?.id).toBe(b.id);
    expect(repo.listBatches()).toHaveLength(1);
  });

  it("setBatchStatus stamps started_at on running and ended_at on ended", () => {
    const b = repo.createBatch({ config: {} });

    repo.setBatchStatus(b.id, "running");
    expect(repo.batch(b.id)?.status).toBe("running");
    expect(repo.batch(b.id)?.startedAt).toBeTypeOf("number");

    repo.setBatchStatus(b.id, "ended", "all done");
    expect(repo.batch(b.id)?.status).toBe("ended");
    expect(repo.batch(b.id)?.endedAt).toBeTypeOf("number");
    expect(repo.batch(b.id)?.endedReason).toBe("all done");
  });

  it("creates a game frozen with treatment factors", () => {
    const b = repo.createBatch({ config: {} });
    const g = repo.createGame({
      batchId: b.id,
      treatment: { playerCount: 4 },
      treatmentName: "group",
    });
    expect(g.batchId).toBe(b.id);
    expect(g.treatment).toEqual({ playerCount: 4 });
    expect(g.treatmentName).toBe("group");
    expect(g.status).toBe("created");
  });

  it("rounds in a game receive monotonically increasing idx", () => {
    const b = repo.createBatch({ config: {} });
    const g = repo.createGame({ batchId: b.id, treatment: {} });

    const r1 = repo.createRound({ gameId: g.id });
    const r2 = repo.createRound({ gameId: g.id, name: "second" });
    const r3 = repo.createRound({ gameId: g.id });

    expect([r1.idx, r2.idx, r3.idx]).toEqual([0, 1, 2]);
  });

  it("stages under a round receive their own idx sequence", () => {
    const b = repo.createBatch({ config: {} });
    const g = repo.createGame({ batchId: b.id, treatment: {} });
    const r = repo.createRound({ gameId: g.id });

    const s1 = repo.createStage({ gameId: g.id, roundId: r.id, durationMs: 10_000 });
    const s2 = repo.createStage({ gameId: g.id, roundId: r.id, durationMs: 10_000 });
    expect([s1.idx, s2.idx]).toEqual([0, 1]);

    // Stages directly under the game (no round) have an independent sequence.
    const direct = repo.createStage({ gameId: g.id, durationMs: 5_000 });
    expect(direct.idx).toBe(0);
  });

  it("createStage rejects non-positive duration", () => {
    const b = repo.createBatch({ config: {} });
    const g = repo.createGame({ batchId: b.id, treatment: {} });
    expect(() => repo.createStage({ gameId: g.id, durationMs: 0 })).toThrow(RangeError);
    expect(() => repo.createStage({ gameId: g.id, durationMs: -1 })).toThrow(RangeError);
  });

  it("setStageStarted/Ended updates timestamps", () => {
    const b = repo.createBatch({ config: {} });
    const g = repo.createGame({ batchId: b.id, treatment: {} });
    const s = repo.createStage({ gameId: g.id, durationMs: 60_000 });

    repo.setStageStarted(s.id, 1_000_000, 1_060_000);
    const after = repo.stage(s.id)!;
    expect(after.startedAt).toBe(1_000_000);
    expect(after.endsAt).toBe(1_060_000);

    repo.setStageEnded(s.id, 1_055_000);
    expect(repo.stage(s.id)!.endedAt).toBe(1_055_000);
  });

  it("creates a player and assigns to a game", () => {
    const b = repo.createBatch({ config: {} });
    const g = repo.createGame({ batchId: b.id, treatment: {} });
    const p = repo.createPlayer({ batchId: b.id });

    expect(p.status).toBe("waiting");
    expect(p.gameId).toBeNull();

    repo.assignPlayerToGame(p.id, g.id);
    const after = repo.player(p.id)!;
    expect(after.gameId).toBe(g.id);
    expect(after.batchId).toBe(b.id);
    expect(after.status).toBe("lobby");

    expect(repo.playersInGame(g.id)).toHaveLength(1);
    expect(repo.playersInBatch(b.id)).toHaveLength(1);
  });

  it("setPlayerStatus to ended stamps reason and time", () => {
    const b = repo.createBatch({ config: {} });
    const p = repo.createPlayer({ batchId: b.id });

    repo.setPlayerStatus(p.id, "ended", "no more games");
    const after = repo.player(p.id)!;
    expect(after.status).toBe("ended");
    expect(after.endedReason).toBe("no more games");
    expect(after.endedAt).toBeTypeOf("number");
  });

  it("setPlayerStatus back to lobby clears ended fields", () => {
    const b = repo.createBatch({ config: {} });
    const p = repo.createPlayer({ batchId: b.id });

    repo.setPlayerStatus(p.id, "ended", "kicked");
    repo.setPlayerStatus(p.id, "lobby");

    const after = repo.player(p.id)!;
    expect(after.status).toBe("lobby");
    expect(after.endedReason).toBeNull();
    expect(after.endedAt).toBeNull();
  });

  it("upsertParticipant returns the existing row on duplicate identifier", () => {
    const a = repo.upsertParticipant({ identifier: "prolific:x1", metadata: { src: "p" } });
    const b = repo.upsertParticipant({ identifier: "prolific:x1", metadata: { src: "later" } });
    expect(a.id).toBe(b.id);
    // Metadata kept from first insert.
    expect(b.metadata).toEqual({ src: "p" });
  });
});
