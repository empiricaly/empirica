// @ts-check
/// <reference path="./index.d.ts" />

const { test } = require("@playwright/test");
import { Context } from "./context";
import { adminNewBatch, quickGame } from "./admin";
import { playerStart, submitStage, waitGameFinished } from "./player";
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
  await sleep(200);
  await ctx.expectPlayers("game", "key1", { hello: "world" });

  // Mutate object in place, verify that value is updated
  await ctx.players[1].mutObj("game", "key1", "hello", "all");
  await sleep(200);
  await ctx.expectPlayers("game", "key1", { hello: "all" });

  // And again
  await ctx.players[1].mutObj("game", "key1", "hello", "everyone");
  await sleep(200);
  await ctx.expectPlayers("game", "key1", { hello: "everyone" });

  // This should be a noop, you wouldn't see it from the interface, but you
  // should be able to see from the test logs (confirmed at time of writing).
  await ctx.players[1].mutObj("game", "key1", "hello", "everyone");
  await sleep(200);
  await ctx.expectPlayers("game", "key1", { hello: "everyone" });

  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitGameFinished);

  await ctx.close();
});
