import { test } from "@playwright/test";
import ExperimentPage from "../page-objects/main/ExperimentPage";
import BatchesAdminPage, {
  GamesStatus,
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
  test("creates a simple batch with 2 games for solo players, 2 players are assigned to two games", async ({
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

    await batchesPage.checkGameStatus(
      {
        gameNumber: 1,
        batchNumber,
      },
      GamesStatus.Created
    );

    await player2Page.acceptConsent();

    await batchesPage.checkGameStatus(
      {
        gameNumber: 0,
        batchNumber,
      },
      GamesStatus.Running
    );

    await batchesPage.checkGameStatus(
      {
        gameNumber: 1,
        batchNumber,
      },
      GamesStatus.Created
    );

    await player1Page.login({ playerId: player1.id });
    await player2Page.login({ playerId: player2.id });

    await player1Page.passInstructions();
    await player2Page.passInstructions();

    await player1Page.checkIfJellyBeansVisible();
    await player2Page.checkIfJellyBeansVisible();

    await player1Page.playJellyBeanGame({ count: 123 });

    await player1Page.passMineSweeper();

    await player1Page.fillExitSurvey({
      age: player1.age,
      gender: player1.gender,
    });

    await batchesPage.findGameByStatus(
      {
        batchNumber,
      },
      GamesStatus.Ended
    );

    await player1Page.checkIfFinished();
  });
});
