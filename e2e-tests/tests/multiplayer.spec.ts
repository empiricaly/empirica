import { test, expect } from '@playwright/test';
import * as uuid from 'uuid';
import ExperimentPage from '../page-objects/main/ExperimentPage';
import BatchesAdminPage from '../page-objects/admin/BatchesAdminPage';
import NoExperimentsElement from '../page-objects/main/elements/NoExperimentsElement';
import EmpiricaTestFactory from '../setup/EmpiricaTestFactory';
import { GamesTypeTreatment } from '../page-objects/admin/BatchesAdminPage';

const baseUrl = 'http://localhost:3000';

const testFactory = new EmpiricaTestFactory({
  installMode: 'NPM' // TODO: implement caching of the empirica project
});

test.beforeAll(async () => {
  await testFactory.init();
});

test.afterAll(async () => {
  await testFactory.teardown();
});


test.describe('Empirica in multi-player mode', () => {

  test.only('creates batch with 1 game with one players, into view, one player finishes the game, 2nd player sees no games', async ({ browser }) => {
    const batchesPage = new BatchesAdminPage({
      browser,
      baseUrl
    });

    const player1Id = `player-${uuid.v4()}`;
    const gamesCount = 1;
    const gameMode = GamesTypeTreatment.TwoPlayers;
    const playerAge = 25;
    const playerGender = 'male';
    const jellyBeansCount = 1200;
    
    await batchesPage.open();

    await batchesPage.createBatch({ 
      mode: gameMode, 
      gamesCount 
    });

    await batchesPage.startGame();

    const player1Page = new ExperimentPage({
      browser,
      baseUrl
    });

    const player2Page = new ExperimentPage({
      browser,
      baseUrl
    });

    await player1Page.open();
    
    await player2Page.open();

    await player1Page.acceptConsent();
    
    await player1Page.login({ playerId: player1Id });
    
    await player1Page.passInstructions();

    await player2Page.open();

    await player2Page.checkIfNoExperimentsVisible();

    await player1Page.playJellyBeanGame({ count: jellyBeansCount });

    await player1Page.playMinesweeper();

    await player1Page.fillExitSurvey({ age: playerAge, gender: playerGender });

    await player1Page.checkIfFinished();

    await player2Page.checkIfNoExperimentsVisible();
  });
});
