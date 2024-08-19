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
// run them serially. This will change when we have a dedicated server for each
// test.
test.describe.configure({ mode: "serial" });

test("baseline", async ({ browser }) => {
  const ctx = new Context(browser);

  const playerCount = 2;
  const roundCount = 2;
  const stageCount = 5;
  const totalStages = roundCount * stageCount;
  // ctx.logMatching(/.*/);

  await ctx.start();
  await ctx.addPlayers(playerCount);
  ctx.players[0].logWS();
  ctx.players[0].listenScope("game");

  await ctx.applyAdmin(
    adminNewBatch({
      treatmentConfig: quickGame(playerCount, roundCount, stageCount),
    })
  );

  for (let i = 0; i < totalStages; i++) {
    if (i === 0) {
      await ctx.applyPlayers(playerStart);
    } else {
      await ctx.applyPlayers(waitNextStage);
    }

    // Check that all objects (player, game, round, stage) and scoped objects
    // (player.stage, player.round, and player.game) are available for all
    // players, on all stages.
    for (const player of ctx.players) {
      await player.game.shouldExist();
      await player.round.shouldExist();
      await player.stage.shouldExist();
      await player.player.shouldExist();
      await player.player.game.shouldExist();
      await player.player.round.shouldExist();
      await player.player.stage.shouldExist();

      const players = await player.players();
      for (const p of players) {
        await p.game.shouldExist();
        await p.round.shouldExist();
        await p.stage.shouldExist();
      }
    }

    await ctx.applyPlayers(submitStage);
  }

  await ctx.applyPlayers(waitGameFinished);

  await ctx.close();
});

test("1 x 10 player", async ({ browser }) => {
  const ctx = new Context(browser);

  ctx.logMatching(/stage started/);

  await ctx.start();
  await ctx.addPlayers(10);
  ctx.players[0].logWS();

  await ctx.applyAdmin(adminNewBatch({ treatmentName: "10player" }));

  await ctx.applyPlayers(playerStart);

  await ctx.close();
});

test.skip("4 x 10 player - staggered arrival", async ({ browser }) => {
  const ctx = new Context(browser);

  ctx.logMatching(/stage started/);

  await ctx.start();
  await ctx.addPlayers(40);
  ctx.players[0].logWS();

  await ctx.applyAdmin(adminNewBatch({ treatmentName: "10player" }));
  await ctx.applyAdmin(adminNewBatch({ treatmentName: "10player" }));
  await ctx.applyAdmin(adminNewBatch({ treatmentName: "10player" }));
  await ctx.applyAdmin(adminNewBatch({ treatmentName: "10player" }));

  const starts = [];
  for (const player of ctx.players) {
    starts.push(player.apply(playerStart));
    sleep(1000);
  }

  await Promise.all(starts);

  await ctx.close();
});

// This fails about 1/2 of the time. Some game(s) get assigned >10 players, then
// the remaining game can't start because there are no more players available.
// Need to find out why the distributed assigned is not working as expected
// (there's a race condition between the time of assignment and fetching the
// number of players in the game). AND why overflow is not working as expected.
// First need to debug overflow.
test("4 x 10 player - concurrent arrival", async ({ browser }) => {
  const ctx = new Context(browser);

  ctx.logMatching(/stage started/);

  await ctx.start();
  await ctx.addPlayers(40);
  ctx.players[0].logWS();

  await ctx.applyAdmin(adminNewBatch({ treatmentName: "10player" }));
  await ctx.applyAdmin(adminNewBatch({ treatmentName: "10player" }));
  await ctx.applyAdmin(adminNewBatch({ treatmentName: "10player" }));
  await ctx.applyAdmin(adminNewBatch({ treatmentName: "10player" }));
  await ctx.applyPlayers(playerStart);
  await ctx.close();
});

test("1 x 20 player - concurrent arrival", async ({ browser }) => {
  const ctx = new Context(browser);

  ctx.logMatching(/stage started/);

  await ctx.start();
  await ctx.addPlayers(20);
  ctx.players[0].logWS();

  await ctx.applyAdmin(adminNewBatch({ treatmentName: "20player" }));
  await ctx.applyPlayers(playerStart);
  await ctx.close();
});
