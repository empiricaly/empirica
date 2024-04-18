// @ts-check
/// <reference path="./index.d.ts" />

const { test } = require("@playwright/test");
import { adminNewBatch, quickGame } from "./admin";
import { Context } from "./context";
import {
  playerSignIn,
  playerStart,
  submitStage,
  waitGameFinished,
  waitNextStage,
} from "./player";
import { sleep } from "./utils";

// At the moment, we use the same empirica server for all tests, so we need to
// run them serially. This will change when we have a dedicated server for each
// test.
test.describe.configure({ mode: "serial" });

// This test is a test for the lobby with configuration shared/ignore, which
// means that all players share a timer and we ignore the fact that there are
// not enough players to start the game, and start the game with the players
// that are available.
// To test this, we set a very short duration for the lobby, and we start the
// game with only one player, even with a player count of 2.
test("lobby shared ignore", async ({ browser }) => {
  const ctx = new Context(browser);

  const playerCount = 2;
  const roundCount = 1;
  const stageCount = 2;
  const totalStages = roundCount * stageCount;

  await ctx.start();
  await ctx.addPlayers(playerCount);
  ctx.players[0].logWS();
  ctx.players[0].listenScope("game");

  await ctx.applyAdmin(
    adminNewBatch({
      treatmentConfig: quickGame(playerCount, roundCount, stageCount),
      lobbyConfig: {
        name: "Fast shared ignore",
        kind: "shared",
        duration: 2_000_000_000,
        strategy: "ignore",
      },
    })
  );

  for (let i = 0; i < totalStages; i++) {
    if (i === 0) {
      // ONLY Player 0 starts the game
      // Player 1 is ignored
      // Lobby-ignore should start the game with only one player
      await ctx.players[0].apply(playerStart);
    } else {
      await ctx.players[0].apply(waitNextStage);
    }

    await ctx.players[0].screenshot(`stage-${i}`);

    await ctx.players[0].apply(submitStage);
  }

  await ctx.players[0].apply(waitGameFinished);

  await ctx.close();
});

// This test is a test for the lobby with configuration shared/fail, which
// means that all players share a timer and we fail the game if not enough
// players to start the game.
// To test this, we set a very short duration for the lobby.
test("lobby shared fail", async ({ browser }) => {
  const ctx = new Context(browser);

  const playerCount = 2;
  const roundCount = 1;
  const stageCount = 2;

  await ctx.start();
  await ctx.addPlayers(playerCount);
  ctx.players[0].logWS();
  ctx.players[0].listenScope("game");
  ctx.logMatching(/HERE/);

  await ctx.applyAdmin(
    adminNewBatch({
      treatmentConfig: quickGame(playerCount, roundCount, stageCount),
      lobbyConfig: {
        name: "Fast shared fail",
        kind: "shared",
        duration: 2_000_000_000, // 2s, in ns...
        strategy: "fail",
      },
    })
  );

  await ctx.players[0].apply(playerSignIn);
  await ctx.players[0].screenshot("start-game");
  await sleep(2500);
  await ctx.players[0].screenshot("end-maybe");
  await ctx.players[0].apply(waitGameFinished);

  await ctx.close();
});
