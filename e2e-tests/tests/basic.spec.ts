import { test } from "@playwright/test";
import { createPlayer } from "../utils/playerUtils";
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

test.describe("Empirica in single player mode", () => {
  test("Empty experiemnt page loads successfully", async ({ browser }) => {
    const experimentPage = new ExperimentPage({
      browser,
      baseUrl,
    });

    await experimentPage.open();
  });

  test("Bathes page loads successfully", async ({ browser }) => {
    const batchesAdminPage = new BatchesAdminPage({
      browser,
      baseUrl,
    });

    await batchesAdminPage.open();
  });

  test("creates batch with 1 game with one player, into view, player passes through the game", async ({
    browser,
  }) => {
    const batchesPage = new BatchesAdminPage({
      browser,
      baseUrl,
    });

    const player = createPlayer();
    const gamesCount = 1;
    const gameMode = GamesTypeTreatment.Solo;
    const jellyBeansCount = 1200;

    await batchesPage.init();

    await batchesPage.open();

    await batchesPage.createBatch({
      mode: gameMode,
      gamesCount,
    });

    await batchesPage.startGame();

    const experimentPage = new ExperimentPage({
      browser,
      baseUrl,
    });

    await experimentPage.init();

    await experimentPage.open();

    await experimentPage.acceptConsent();

    await experimentPage.login({ playerId: player.id });

    await experimentPage.passInstructions();

    await experimentPage.reload();

    await experimentPage.checkIfTimerVisible();

    await experimentPage.playJellyBeanGame({ count: jellyBeansCount });

    await experimentPage.reload();

    await experimentPage.checkIfTimerVisible();

    await experimentPage.passMineSweeper();

    await experimentPage.fillExitSurvey({
      age: player.age,
      gender: player.gender,
    });

    await experimentPage.checkIfFinished();
  });
});
