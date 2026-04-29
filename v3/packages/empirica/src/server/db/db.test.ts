import { describe, expect, it } from "vitest";
import { openMemoryDb } from "./db.js";
import { applyMigrations } from "./migrations.js";

describe("openMemoryDb", () => {
  it("opens an in-memory db with all tables created", () => {
    const db = openMemoryDb();

    const rows = db
      .$sqlite.prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`,
      )
      .all() as { name: string }[];

    const names = rows.map((r) => r.name);
    expect(names).toEqual(
      [
        "admins",
        "batches",
        "events",
        "games",
        "globals",
        "participants",
        "players",
        "rounds",
        "schema_meta",
        "sqlite_sequence",
        "stages",
        "state",
        "treatments",
      ].sort(),
    );

    db.$sqlite.close();
  });

  it("enables foreign keys", () => {
    const db = openMemoryDb();
    const fk = db.$sqlite.pragma("foreign_keys", { simple: true });
    expect(fk).toBe(1);
    db.$sqlite.close();
  });

  it("records the applied schema version", () => {
    const db = openMemoryDb();
    const row = db
      .$sqlite.prepare("SELECT value FROM schema_meta WHERE key = ?")
      .get("schema_version") as { value: string };
    expect(Number(row.value)).toBeGreaterThan(0);
    db.$sqlite.close();
  });
});

describe("applyMigrations", () => {
  it("is idempotent", () => {
    const db = openMemoryDb();
    const before = applyMigrations(db.$sqlite);
    expect(before.applied).toHaveLength(0); // already applied during open

    const again = applyMigrations(db.$sqlite);
    expect(again.applied).toHaveLength(0);
    expect(again.current).toBe(before.current);

    db.$sqlite.close();
  });
});

describe("foreign-key cascades", () => {
  it("deleting a batch cascades to its games", () => {
    const db = openMemoryDb();

    db.$sqlite
      .prepare(`INSERT INTO batches(id, config_json) VALUES (?, ?)`)
      .run("b1", "{}");
    db.$sqlite
      .prepare(`INSERT INTO games(id, batch_id, treatment_json) VALUES (?, ?, ?)`)
      .run("g1", "b1", "{}");

    db.$sqlite.prepare(`DELETE FROM batches WHERE id = ?`).run("b1");

    const games = db.$sqlite.prepare(`SELECT id FROM games`).all() as {
      id: string;
    }[];
    expect(games).toHaveLength(0);

    db.$sqlite.close();
  });

  it("deleting a game cascades to its rounds and stages", () => {
    const db = openMemoryDb();

    db.$sqlite
      .prepare(`INSERT INTO batches(id, config_json) VALUES (?, ?)`)
      .run("b1", "{}");
    db.$sqlite
      .prepare(`INSERT INTO games(id, batch_id, treatment_json) VALUES (?, ?, ?)`)
      .run("g1", "b1", "{}");
    db.$sqlite
      .prepare(`INSERT INTO rounds(id, game_id, idx) VALUES (?, ?, ?)`)
      .run("r1", "g1", 0);
    db.$sqlite
      .prepare(
        `INSERT INTO stages(id, game_id, round_id, idx, duration_ms) VALUES (?, ?, ?, ?, ?)`,
      )
      .run("s1", "g1", "r1", 0, 60_000);

    db.$sqlite.prepare(`DELETE FROM games WHERE id = ?`).run("g1");

    expect(db.$sqlite.prepare(`SELECT * FROM rounds`).all()).toHaveLength(0);
    expect(db.$sqlite.prepare(`SELECT * FROM stages`).all()).toHaveLength(0);

    db.$sqlite.close();
  });

  it("deleting a game nulls out players' game_id (set null)", () => {
    const db = openMemoryDb();

    db.$sqlite
      .prepare(`INSERT INTO batches(id, config_json) VALUES (?, ?)`)
      .run("b1", "{}");
    db.$sqlite
      .prepare(`INSERT INTO games(id, batch_id, treatment_json) VALUES (?, ?, ?)`)
      .run("g1", "b1", "{}");
    db.$sqlite
      .prepare(`INSERT INTO players(id, game_id, batch_id) VALUES (?, ?, ?)`)
      .run("p1", "g1", "b1");

    db.$sqlite.prepare(`DELETE FROM games WHERE id = ?`).run("g1");

    const player = db.$sqlite
      .prepare(`SELECT game_id FROM players WHERE id = ?`)
      .get("p1") as { game_id: string | null };
    expect(player.game_id).toBeNull();

    db.$sqlite.close();
  });
});
