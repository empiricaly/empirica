// @ts-check
/// <reference path="./index.d.ts" />

const { test } = require("@playwright/test");
import { Context } from "./context";
import { adminNewBatch } from "./admin";
import { playerStart } from "./player";
import { sleep } from "./utils";

// At the moment, we use the same empirica server for all tests, so we need to
// run them serially. This will change when we have a dedicated server for each
// test.
test.describe.configure({ mode: "serial" });

test("1 x 10 player", async ({ browser }) => {
  const ctx = new Context(browser);

  ctx.logMatching(/stage started/);

  await ctx.start();
  await ctx.addPlayers(10);
  ctx.players[0].logWS();

  await ctx.applyAdmin(adminNewBatch("10player"));

  const starts = [];
  for (const player of ctx.players) {
    starts.push(player.apply(playerStart));
    sleep(1000);
  }

  await Promise.all(starts);

  await ctx.close();
});

test.skip("4 x 10 player - staggered arrival", async ({ browser }) => {
  const ctx = new Context(browser);

  ctx.logMatching(/stage started/);

  await ctx.start();
  await ctx.addPlayers(40);
  ctx.players[0].logWS();

  await ctx.applyAdmin(adminNewBatch("10player"));
  await ctx.applyAdmin(adminNewBatch("10player"));
  await ctx.applyAdmin(adminNewBatch("10player"));
  await ctx.applyAdmin(adminNewBatch("10player"));

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
test.skip("4 x 10 player - concurrent arrival", async ({ browser }) => {
  const ctx = new Context(browser);

  ctx.logMatching(/stage started/);

  await ctx.start();
  await ctx.addPlayers(40);
  ctx.players[0].logWS();

  await ctx.applyAdmin(adminNewBatch("10player"));
  await ctx.applyAdmin(adminNewBatch("10player"));
  await ctx.applyAdmin(adminNewBatch("10player"));
  await ctx.applyAdmin(adminNewBatch("10player"));
  await ctx.applyPlayers(playerStart);
  await ctx.close();
});

test("1 x 40 player - concurrent arrival", async ({ browser }) => {
  const ctx = new Context(browser);

  ctx.logMatching(/stage started/);

  await ctx.start();
  await ctx.addPlayers(40);
  ctx.players[0].logWS();

  await ctx.applyAdmin(adminNewBatch("40player"));
  await ctx.applyPlayers(playerStart);
  await ctx.close();
});
