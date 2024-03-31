// @ts-check

const { test, expect } = require("@playwright/test");
import { adminNewBatch, quickGame } from "./admin";
import { Context } from "./context";
import {
  playerStart,
  submitStage,
  waitGameFinished,
  waitNextStage,
} from "./player";
import { randomString, sleep } from "./utils";

// At the moment, we use the same empirica server for all tests, so we need to
// run them serially. This will change when we have a dedicated server for eac XLh
// test.
test.describe.configure({ mode: "serial" });

test("attribute as object, correct equality check", async ({ browser }) => {
  const ctx = new Context(browser);

  const playerCount = 2;
  const roundCount = 1;
  const stageCount = 1;

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

  // TODO fix watching keys...
  // ctx.players[0].listenKey("game", "key1");
  // ctx.players[1].listenKey("game", "key1");

  await ctx.applyPlayers(playerStart);

  // Initial value
  await ctx.players[0].set("game", "key1", { hello: "world" });
  await ctx.expectPlayers("game", "key1", { hello: "world" });

  // Mutate object in place, verify that value is updated
  await ctx.players[1].mutObj("game", "key1", "hello", "all");
  await ctx.expectPlayers("game", "key1", { hello: "all" });

  // And again
  await ctx.players[1].mutObj("game", "key1", "hello", "everyone");
  await ctx.expectPlayers("game", "key1", { hello: "everyone" });

  // This should be a noop, you wouldn't see it from the interface, but you
  // should be able to see from the test logs (confirmed at time of writing).
  await ctx.players[1].mutObj("game", "key1", "hello", "everyone");
  await ctx.expectPlayers("game", "key1", { hello: "everyone" });

  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitGameFinished);

  await ctx.close();
});

test("attribute as bool, correct equality check", async ({ browser }) => {
  const ctx = new Context(browser);

  const playerCount = 2;
  const roundCount = 1;
  const stageCount = 2;

  ctx.logMatching(/mutObj/);
  ctx.logMatching(/key1/);
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

  // Initial value
  await ctx.players[0].set("game", "key1", true);
  await ctx.expectPlayers("game", "key1", true);

  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitNextStage);

  // We mutate key1 from true in the previous stage to false in the onStageStart
  // callback, here we verify that value is updated.
  await ctx.expectPlayers("game", "key1", false);

  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitGameFinished);

  await ctx.close();
});

test("attribute persistent or ephemeral", async ({ browser }) => {
  const ctx = new Context(browser);

  const playerCount = 2;
  const roundCount = 1;
  const stageCount = 2;

  ctx.logMatching(/keya/);
  ctx.logMatching(/keyb/);

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

  // Baseline, normal keya is saved
  await ctx.players[0].set("game", "keya", "123");
  await ctx.expectPlayers("game", "keya", "123");

  // Ephemeral keyb is NOT saved
  const randstr = randomString(12);
  const key = `key-${randstr}`;
  const val = `val-${randstr}`;
  await ctx.players[0].set("game", key, val, { ephemeral: true });
  await ctx.expectPlayers("game", key, val);

  // Next stage
  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitNextStage);

  // Check both keys are available to all players
  await ctx.expectPlayers("game", "keya", "123");
  await ctx.expectPlayers("game", key, val);

  // Wait a bit for the tajriba file to be written
  await sleep(1200);

  // keya should exist
  expect(await ctx.tajContains("keya"), "keya exists").toBeTruthy();

  // ephemeral key and value should NOT exist
  expect(await ctx.tajContains(key), "ephemeral key exists").toBeFalsy();
  expect(await ctx.tajContains(val), "ephemeral value exists").toBeFalsy();

  // Finish game
  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitGameFinished);

  await ctx.close();
});
