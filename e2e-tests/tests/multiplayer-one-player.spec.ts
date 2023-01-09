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
  test("creates batch with 1 game with one player, into view, one player finishes the game, 2nd player sees no games", async ({
    browser,
  }) => {
    const batchesPage = new BatchesAdminPage({
      browser,
      baseUrl,
    });

    const player1 = createPlayer();
    const gamesCount = 1;
    const gameMode = GamesTypeTreatment.Solo;
    const jellyBeansCount = 1200;

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

    await player1Page.acceptConsent();

    await player1Page.login({ playerId: player1.id });

    await player1Page.passInstructions();

    await player2Page.open();

    await player2Page.checkIfNoExperimentsVisible();

    await player1Page.playJellyBeanGame({ count: jellyBeansCount });

    await player1Page.passMineSweeper();

    await player1Page.fillExitSurvey({
      age: player1.age,
      gender: player1.gender,
    });

    await player1Page.checkIfFinished();

    await player2Page.checkIfNoExperimentsVisible();
  });
});
