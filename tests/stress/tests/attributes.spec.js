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
import { sleep } from "./utils";

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
