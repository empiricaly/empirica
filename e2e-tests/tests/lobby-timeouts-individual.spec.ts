import { test } from "@playwright/test";
import ExperimentPage from "../page-objects/main/ExperimentPage";
import BatchesAdminPage, {
  BatchStatus,
  GamesTypeTreatment,
} from "../page-objects/admin/BatchesAdminPage";
import EmpiricaTestFactory from "../setup/EmpiricaTestFactory";
import { createPlayer } from "../utils/playerUtils";

import { baseUrl } from "../setup/setupConstants";
import LobbiesAdminPage, {
  LobbyTimeoutKind,
  LobbyTimeoutStrategy,
} from "../page-objects/admin/LobbiesAdminPage";

const testFactory = new EmpiricaTestFactory();

test.beforeAll(async () => {
  await testFactory.init();
});

test.afterAll(async () => {
  await testFactory.teardown();
});

test.describe("Lobby timeouts in Empirica", () => {
  test("create configuration with a individual lobby timeout", async ({
    browser,
  }) => {
    const batchesPage = new BatchesAdminPage({
      browser,
      baseUrl,
    });
    const lobbiesPage = new LobbiesAdminPage({
      browser,
      baseUrl,
    });

    const player1 = createPlayer();
    const gamesCount = 1;
    const gameMode = GamesTypeTreatment.TwoPlayers;
    const lobbyConfigration = {
      name: "test",
      description: "Testing individual lobby timeout",
      duration: "5s",
      kind: LobbyTimeoutKind.Individual,
    };

    await lobbiesPage.open();

    await lobbiesPage.createNewLobbyConfiguration(lobbyConfigration);

    await batchesPage.open();

    await batchesPage.createBatch({
      mode: gameMode,
      gamesCount,
      lobbyConfigrationName: LobbiesAdminPage.getLobbyName(lobbyConfigration),
    });

    await batchesPage.checkBatchStatus({
      batchNumber: 0,
      status: BatchStatus.Created,
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

    // Here we'd wait for 5 seconds until the player gets kicked out

    await player1Page.fillExitSurvey({
      age: player1.age,
      gender: player1.gender,
    });

    await batchesPage.checkBatchStatus({
      batchNumber: 0,
      status: BatchStatus.Created,
    });

    await player1Page.checkIfFinished();
  });
});
