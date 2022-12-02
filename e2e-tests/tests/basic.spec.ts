import { test, expect } from '@playwright/test';
import * as uuid from 'uuid';
import ExperimentPage from '../page-objects/main/ExperimentPage';
import AdminPage from '../page-objects/admin/AdminPage';
import NoExperimentsElement from '../page-objects/main/elements/NoExperimentsElement';
import EmpiricaTestFactory from '../setup/EmpiricaTestFactory';
import BatchesAdminPage, { GamesTypeTreatment } from '../page-objects/admin/BatchesAdminPage';

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


test.describe('Empirica in single player mode', () => {

  test('Empty experiemnt page loads successfully', async ({ browser }) => {
    const experimentPage = new ExperimentPage({
      browser,
      baseUrl
    })

    await experimentPage.open();
  });

  test('Bathes page loads successfully', async ({ browser }) => {
    const batchesAdminPage = new BatchesAdminPage({
      browser,
      baseUrl
    })

    await batchesAdminPage.open();
  });

  test.only('creates batch with 1 game with one player, into view, player passes through the game', async ({ browser }) => {
    const batchesPage = new BatchesAdminPage({
      browser,
      baseUrl
    });

    const playerId = `player-${uuid.v4()}`;
    const gamesCount = 1;
    const gameMode = GamesTypeTreatment.Solo;
    const playerAge = 25;
    const playerGender = 'male';
    const jellyBeansCount = 1200;

    await batchesPage.init();

    await batchesPage.open();

    await batchesPage.createBatch({ 
      mode: gameMode, 
      gamesCount 
    });

    await batchesPage.startGame();

    const experimentPage = new ExperimentPage({
      browser,
      baseUrl
    });

    await experimentPage.init();

    await experimentPage.open();

    await experimentPage.acceptConsent();

    await experimentPage.login({ playerId });

    await experimentPage.passInstructions();

    await experimentPage.playJellyBeanGame({ count: jellyBeansCount });

    await experimentPage.playMinesweeper();

    await experimentPage.fillExitSurvey({ age: playerAge, gender: playerGender });

    await experimentPage.checkIfFinished()
  });
});
