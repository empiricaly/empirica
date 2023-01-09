import { test } from "@playwright/test";
import ExperimentPage from "../page-objects/main/ExperimentPage";
import BatchesAdminPage, {
  BatchStatus,
  GamesTypeTreatment,
} from "../page-objects/admin/BatchesAdminPage";
import EmpiricaTestFactory from "../setup/EmpiricaTestFactory";
import { createPlayer } from "../utils/playerUtils";

import { baseUrl } from "../setup/setupConstants";

const testFactory = new EmpiricaTestFactory();

test.beforeAll(async () => {
  await testFactory.init();
});

test.afterAll(async () => {
  await testFactory.teardown();
});

test.describe("Assignments in Empirica", () => {
  // Skipping for now, will improve this test
  test.skip("creates a simple batch with 2 games for solo players, stop batch, players get kicked out", async ({
    browser,
  }) => {
    const batchesPage = new BatchesAdminPage({
      browser,
      baseUrl,
    });

    const player1 = createPlayer();
    const player2 = createPlayer();
    const gamesCount = 2;
    const gameMode = GamesTypeTreatment.Solo;
    const batchNumber = 0;

    await batchesPage.open();

    await batchesPage.createBatch({
      mode: gameMode,
      gamesCount,
    });

    await batchesPage.startGame();

    const player1Page = new ExperimentPage({
      browser,
      baseUrl,
    });

    const player2Page = new ExperimentPage({
      browser,
      baseUrl,
    });

    await player1Page.open();
    await player2Page.open();

    await player1Page.acceptConsent();

    await player2Page.acceptConsent();

    await player1Page.login({ playerId: player1.id });
    await player2Page.login({ playerId: player2.id });

    await player1Page.passInstructions();
    await player2Page.passInstructions();

    await batchesPage.stopBatch({ batchNumber: 0 });

    await player1Page.fillExitSurvey({
      age: player1.age,
      gender: player1.gender,
    });

    await player2Page.fillExitSurvey({
      age: player2.age,
      gender: player2.gender,
    });

    await batchesPage.checkBatchStatus({
      batchNumber: 0,
      status: BatchStatus.Terminated,
    });
  });
});
