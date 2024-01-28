// @ts-check
/// <reference path="./index.d.ts" />

const { test } = require("@playwright/test");
import { Context } from "./context";
import { adminNewBatch, quickGame } from "./admin";
import {
  playerStart,
  submitStage,
  waitGameFinished,
  waitNextStage,
} from "./player";
import { exec } from "./utils";

// At the moment, we use the same empirica server for all tests, so we need to
// run them serially. This will change when we have a dedicated server for eac XLh
// test.
test.describe.configure({ mode: "serial" });

test.skip("export correctness", async ({ browser }) => {
  const testDir = process.env.EMPIRICA_TEST_DIR || "";
  test.skip(!testDir, "EMPIRICA_TEST_DIR not set, needed for export test");

  const ctx = new Context(browser);

  const playerCount = 2;
  const roundCount = 2;
  const stageCount = 2;

  ctx.logMatching(/mutObj/);
  ctx.logMatching(/ set/);

  await ctx.start();
  await ctx.addPlayers(playerCount);
  ctx.players[0].logWS();
  ctx.players[1].logWS();

  await ctx.applyAdmin(
    adminNewBatch({
      treatmentConfig: quickGame(playerCount, roundCount, stageCount),
    })
  );

  await ctx.applyPlayers(playerStart);

  // Round 1 Stage 1

  for (let i = 0; i < 10; i++) {
    await ctx.players[0].set("game", `key${i}`, { hello: `world${i}` });
  }

  const expected = [];
  for (let i = 0; i < 10; i++) {
    expected.push(ctx.expectPlayers("game", `key${i}`, { hello: `world${i}` }));
  }

  await Promise.all(expected);

  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitNextStage);

  // Round 1 Stage 2

  for (let i = 0; i < 10; i++) {
    await ctx.players[i % 2].set("round", `key${i * 10}`, {
      hello: `world${i}`,
    });
  }

  const expected2 = [];
  for (let i = 0; i < 10; i++) {
    expected2.push(
      ctx.expectPlayers("round", `key${i * 10}`, {
        hello: `world${i}`,
      })
    );
  }

  await Promise.all(expected2);

  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitNextStage);

  // Round 2 Stage 1

  for (let i = 0; i < 10; i++) {
    await ctx.players[i % 2].set("stage", `key${i * 100}`, {
      hello: `world${i}`,
    });
  }

  const expected3 = [];
  for (let i = 0; i < 10; i++) {
    expected3.push(
      ctx.expectPlayers("stage", `key${i * 100}`, {
        hello: `world${i}`,
      })
    );
  }

  await Promise.all(expected3);

  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitNextStage);

  // Round 2 Stage 2

  for (let i = 0; i < 10; i++) {
    await ctx.players[i % 2].set("player", `key${i * 1000}`, {
      hello: `world${i}`,
    });
  }

  const expected4 = [];
  for (let i = 0; i < 10; i++) {
    expected3.push(
      ctx.players[i % 2].expect("player", `key${i * 1000}`, {
        hello: `world${i}`,
      })
    );
  }

  for (let i = 0; i < 10; i++) {
    await ctx.players[i % 2].set("playerGame", `key${i * 10000}`, {
      hello: `world${i}`,
    });
  }

  for (let i = 0; i < 10; i++) {
    expected3.push(
      ctx.players[i % 2].expect("playerGame", `key${i * 10000}`, {
        hello: `world${i}`,
      })
    );
  }

  for (let i = 0; i < 10; i++) {
    await ctx.players[i % 2].set("playerRound", `key${i * 10000}`, {
      hello: `world${i}`,
    });
  }

  for (let i = 0; i < 10; i++) {
    expected3.push(
      ctx.players[i % 2].expect("playerRound", `key${i * 10000}`, {
        hello: `world${i}`,
      })
    );
  }

  for (let i = 0; i < 10; i++) {
    await ctx.players[i % 2].set("playerStage", `key${i * 10000}`, {
      hello: `world${i}`,
    });
  }

  for (let i = 0; i < 10; i++) {
    expected3.push(
      ctx.players[i % 2].expect("playerStage", `key${i * 10000}`, {
        hello: `world${i}`,
      })
    );
  }

  await Promise.all(expected4);

  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitGameFinished);

  // const filename = "/tmp/emp_test_export.zip";
  // const res = await exec(`emp export --out ${filename}`, testDir);

  // console.info(res.stdout);
  // console.info(res.stderr);

  await ctx.close();
});
