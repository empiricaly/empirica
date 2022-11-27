import { test, expect } from '@playwright/test';
import * as uuid from 'uuid';
import ExperimentPage from '../page-objects/main/ExperimentPage';
import AdminPage from '../page-objects/admin/AdminPage';
import NoExperimentsElement from '../page-objects/main/NoExperimentsElement';
import EmpiricaTestFactory from '../setup/EmpiricaTestFactory';
import { GamesTypeTreatment } from '../page-objects/admin/BatchesPage';

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


test.describe('Empirica', () => {

  test('Empty experiemnt page loads successfully', async ({ page }) => {
    const experimentPage = new ExperimentPage({
      page,
      baseUrl
    })

    await experimentPage.open();

    const noExperimentsElement = new NoExperimentsElement({ page });

    await expect(await noExperimentsElement.getElement()).toBeVisible();

  });

  test('Admin page loads successfully', async ({ page }) => {
    const adminPage = new AdminPage({
      page,
      baseUrl
    })

    await adminPage.open();

  });

  test.only('creates batch with 1 game with one player, into view, player passes through the game', async ({ page }) => {
    const adminPage = new AdminPage({
      page,
      baseUrl
    });


    const playerId = `player-${uuid.v4()}`;
    const gamesCount = 1;
    const gameMode = GamesTypeTreatment.Solo;
    const playerAge = 25;
    const playerGender = 'male';
    const jellyBeansCount = 1200;

    await adminPage.open();

    const batchesPage = adminPage.getBatchesPage();

    await batchesPage.open();

    await batchesPage.createBatch({ 
      mode: gameMode, 
      gamesCount 
    });

    await batchesPage.startGame();

    const experimentPage = new ExperimentPage({
      page,
      baseUrl
    })

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
