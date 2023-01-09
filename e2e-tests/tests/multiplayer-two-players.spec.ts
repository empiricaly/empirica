import { test } from "@playwright/test";
import ExperimentPage from "../page-objects/main/ExperimentPage";
import BatchesAdminPage, {
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

test.describe("Empirica in multi-player mode", () => {
  test("creates batch with 1 game with 2 players, both players finish the game", async ({
    browser,
  }) => {
    const batchesPage = new BatchesAdminPage({
      browser,
      baseUrl,
    });

    const player1 = createPlayer();
    const player2 = createPlayer();
    const gamesCount = 1;
    const gameMode = GamesTypeTreatment.TwoPlayers;
    const jellyBeansCountPlayer1 = 1234;
    const jellyBeansCountPlayer2 = 512;

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

    await player1Page.checkIfJellyBeansVisible();
    await player2Page.checkIfJellyBeansVisible();

    await player1Page.selectJellyBeansCount({ count: jellyBeansCountPlayer1 });
    await player2Page.selectJellyBeansCount({ count: jellyBeansCountPlayer2 });

    await player1Page.submitJellyBeansResult();
    await player2Page.submitJellyBeansResult();

    await player1Page.finishJellyBeanGame();
    await player2Page.finishJellyBeanGame();

    await player1Page.passMineSweeper();
    await player2Page.passMineSweeper();

    await player1Page.fillExitSurvey({
      age: player1.age,
      gender: player1.gender,
    });

    await player2Page.fillExitSurvey({
      age: player2.age,
      gender: player2.gender,
    });

    await player1Page.checkIfFinished();
    await player2Page.checkIfFinished();
  });
});
