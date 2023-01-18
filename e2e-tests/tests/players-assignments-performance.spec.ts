/* eslint-disable no-plusplus, no-restricted-syntax, no-await-in-loop */
import { test } from "@playwright/test";
import { createPlayer, Player } from "../utils/playerUtils";
import ExperimentPage from "../page-objects/main/ExperimentPage";
import EmpiricaTestFactory from "../setup/EmpiricaTestFactory";
import BatchesAdminPage, {
  GamesTypeTreatment,
} from "../page-objects/admin/BatchesAdminPage";

import { baseUrl } from "../setup/setupConstants";

const testFactory = new EmpiricaTestFactory();

test.beforeAll(async () => {
  await testFactory.init();
});

test.afterAll(async () => {
  await testFactory.teardown();
});

async function addPlayerToGame({ browser, player }) {
  const experimentPage = new ExperimentPage({
    browser,
    baseUrl,
  });

  await experimentPage.init();

  await experimentPage.open();

  await experimentPage.acceptConsent();

  await experimentPage.login({ playerId: player.id });

  await experimentPage.passInstructions();

  return {
    player,
    experimentPage,
  };
}

const GAMES_COUNT = 10;
const PLAYERS_COUNT_PER_GAME = 2;

test.describe("Performance tests for Empirica", () => {
  test.skip("creates batch with multiple games, all players get assigned correctly @performance", async ({
    browser,
  }) => {
    const batchesPage = new BatchesAdminPage({
      browser,
      baseUrl,
    });

    const gameMode = GamesTypeTreatment.TwoPlayers;
    const playersCount = GAMES_COUNT * PLAYERS_COUNT_PER_GAME;

    await batchesPage.init();

    await batchesPage.open();

    await batchesPage.createBatch({
      mode: gameMode,
      gamesCount: GAMES_COUNT,
    });

    await batchesPage.startGame();

    const players: Player[] = [];
    const playersPages: Promise<{
      player: Player;
      experimentPage: ExperimentPage;
    }>[] = [];

    for (let i = 0; i < playersCount; i++) {
      const player = createPlayer();
      players.push(player);

      playersPages.push(addPlayerToGame({ browser, player }));
    }

    // We're adding all the player in parallel:
    await Promise.all(playersPages);

    for (const playerPage of playersPages) {
      const { experimentPage } = await playerPage;

      await experimentPage.checkIfJellyBeansVisible();
    }
  });
});
