import { test } from "@playwright/test";
import ExperimentPage from "../page-objects/main/ExperimentPage";
import BatchesAdminPage, {
  BatchStatus,
  GamesTypeTreatment,
} from "../page-objects/admin/BatchesAdminPage";
import EmpiricaTestFactory, { START_MODES } from "../setup/EmpiricaTestFactory";
import { createPlayer } from "../utils/playerUtils";

import { baseUrl } from "../setup/setupConstants";

const testFactory = new EmpiricaTestFactory({
  startMode: START_MODES.BUNDLE,
});

test.beforeAll(async () => {
  await testFactory.init();
});

test.afterAll(async () => {
  // await testFactory.teardown();
});

test.describe("Deployment in Empirica", () => {
  test("creates bundle with empirica, runs the experiment successfully", async ({
    browser,
  }) => {
    const batchesPage = new BatchesAdminPage({
      browser,
      baseUrl,
    });

    const player1 = createPlayer();
    const gamesCount = 1;
    const gameMode = GamesTypeTreatment.Solo;

    const adminCredentials = await testFactory.getAdminCredentials();

    await batchesPage.open();

    await batchesPage.login(adminCredentials);

    await batchesPage.createBatch({
      mode: gameMode,
      gamesCount,
    });

    await batchesPage.startGame();

    const player1Page = new ExperimentPage({
      browser,
      baseUrl,
    });

    await player1Page.open();

    await player1Page.acceptConsent();

    await player1Page.login({ playerId: player1.id });

    await player1Page.passInstructions();

    await batchesPage.stopBatch({ batchNumber: 0 });

    await player1Page.fillExitSurvey({
      age: player1.age,
      gender: player1.gender,
    });

    await batchesPage.checkBatchStatus({
      batchNumber: 0,
      status: BatchStatus.Terminated,
    });
  });
});
