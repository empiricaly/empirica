// @ts-check
/// <reference path="./index.d.ts" />

const { test } = require("@playwright/test");
import { Context } from "./context";
import { adminNewBatch, quickGame } from "./admin";
import {
  gameStart,
  playerSignIn,
  playerStart,
  submitIntroStep,
  submitStage,
  waitGameFinished,
} from "./player";
import { sleep } from "./utils";

// At the moment, we use the same empirica server for all tests, so we need to
// run them serially. This will change when we have a dedicated server for each
// test.
test.describe.configure({ mode: "serial" });

// This test is a test to see if the player.get("treatment") is working
// correctly in the intro step.
// WARNING: this must be run with:
//   const introSteps = [DemoIntro];
// in the App.jsx file. This cannot be run with other tests and is normally
// disabled. When you need to run it, mark this test with .only and run it
// separately.
test.skip("intro player treament", async ({ browser }) => {
  const ctx = new Context(browser);

  const playerCount = 1;
  const roundCount = 1;
  const stageCount = 1;

  ctx.logMatching(/player treatment found/);

  await ctx.start();
  await ctx.addPlayers(playerCount);
  ctx.players[0].logWS();
  ctx.players[0].listenScope("game");

  await ctx.applyAdmin(
    adminNewBatch({
      treatmentConfig: quickGame(playerCount, roundCount, stageCount),
    })
  );

  await ctx.players[0].expectLogMatching(/player treatment found/, async () => {
    await ctx.applyPlayers(playerSignIn);
    await ctx.applyPlayers(submitIntroStep);
  });
  await ctx.applyPlayers(gameStart);
  await ctx.applyPlayers(submitStage);
  await ctx.applyPlayers(waitGameFinished);

  await ctx.close();
});
