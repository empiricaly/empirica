// @ts-check
/// <reference path="./index.d.ts" />

const { test } = require("@playwright/test");
import { adminNewBatch, quickGame } from "./admin";
import { Context } from "./context";
import {
  clickReplay,
  gameStart,
  playerStart,
  submitStage,
  waitGameFinished,
} from "./player";
import { sleep } from "./utils";

// At the moment, we use the same empirica server for all tests, so we need to
// run them serially. This will change when we have a dedicated server for each
// test.
test.describe.configure({ mode: "serial" });

// This tests whether the player can be reassigned after the first game of the
// player ends.
test("reassignment after game end", async ({ browser }) => {
  const ctx = new Context(browser);

  const playerCount = 1;
  const roundCount = 1;
  const stageCount = 1;

  await ctx.start();
  await ctx.addPlayers(playerCount);
  ctx.players[0].logWS();
  ctx.players[0].listenScope("game");
  ctx.logMatching(/HERE/);

  await ctx.applyAdmin(
    adminNewBatch({
      treatmentConfig: quickGame(playerCount, roundCount, stageCount),
    })
  );

  await ctx.players[0].apply(playerStart);
  await ctx.players[0].apply(submitStage);
  await ctx.players[0].apply(waitGameFinished);

  await ctx.applyAdmin(
    adminNewBatch({
      treatmentConfig: quickGame(playerCount, roundCount, stageCount),
    })
  );

  await sleep(1000);
  await ctx.players[0].screenshot("game1ended");

  await ctx.players[0].apply(clickReplay);

  await ctx.players[0].screenshot("clickedreplay");
  await sleep(1000);
  await ctx.players[0].screenshot("clickedreplay2");

  await ctx.players[0].apply(gameStart);
  await ctx.players[0].apply(submitStage);
  await ctx.players[0].apply(waitGameFinished);

  await ctx.close();
});

// This tests whether the player can be reassigned after the first game of the
// player ends, into a game with different players.
test.only("reassignment after game end with different players", async ({
  browser,
}) => {
  const ctx = new Context(browser);

  const playerCount = 2;
  const roundCount = 1;
  const stageCount = 1;

  await ctx.start();
  await ctx.addPlayers(playerCount);
  ctx.players[0].logWS();
  ctx.logMatching(/HERE/);

  await ctx.applyAdmin(
    adminNewBatch({
      treatmentConfig: quickGame(playerCount, roundCount, stageCount),
    })
  );

  await ctx.applyPlayers(playerStart);
  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitGameFinished);

  await ctx.applyAdmin(
    adminNewBatch({
      treatmentConfig: quickGame(playerCount, roundCount, stageCount),
    })
  );

  await sleep(1000);

  await ctx.players[0].apply(clickReplay);
  await sleep(1000);

  await ctx.addPlayers(1);
  await sleep(1000);

  await ctx.players[2].apply(playerStart);

  await ctx.players[0].screenshot("gamerestart");
  await ctx.players[2].screenshot("gamerestartplayer2");
  await ctx.players[0].apply(gameStart);
  await ctx.players[0].screenshot("gamerestarted");

  await ctx.players[0].apply(submitStage);
  await ctx.players[2].apply(submitStage);
  await ctx.players[0].apply(waitGameFinished);
  await ctx.players[2].apply(waitGameFinished);

  await ctx.close();
});
