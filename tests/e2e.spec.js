const { test, expect } = require('@playwright/test');

function randomIntFromInterval(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function assureNoPendingExperiments(page) {
  await test.step('assure no pending experiments', async () => {
    await page.goto(URL);
    const heading = page.getByText('No experiments available', {exact: true});
    await expect(heading).toBeVisible();
  })
}

const URL = process.env.URL || 'http://localhost:3000'

test('homepage has Empirica Experiment in title and all the links', async ({ page }) => {
  await page.goto(URL);

  await expect(page).toHaveTitle(/Empirica Experiment/);

  const documentationLink = page.getByText('Documentation');
  await expect(documentationLink).toHaveAttribute('href', 'https://docs.empirica.ly');

  const aboutLink = page.getByText('About Empirica', { exact: true });
  await expect(aboutLink).toHaveAttribute('href', 'https://empirica.ly');

  const empiricaLink = page.getByText('Empirica', { exact: true }).locator('..');
  await expect(empiricaLink).toHaveAttribute('href', 'https://empirica.ly');
});

test('creates experiment for a single participant', async ({ context, page }) => {
  test.setTimeout(5000);
  await assureNoPendingExperiments(page);

  await test.step('create experiment in admin panel', async () => {
    const adminPage = await context.newPage();
    await adminPage.goto(URL + '/admin');

    await adminPage.waitForLoadState();

    await expect(adminPage).toHaveURL(/.*admin/);

    await expect(adminPage).toHaveTitle('Empirica Admin');

    await adminPage.getByRole('button', {name: 'New Batch'}).click();

    await adminPage.getByRole('heading', {name: 'New Batch'}).waitFor();

    await adminPage.locator('select').selectOption({label: 'Solo'});

    await adminPage.getByRole('button', {name: 'Create'}).click();

    await adminPage.getByRole('button', {name: 'Start'}).click();
  })

  await test.step('complete experiment as participant', async () => {
    await page.getByRole('button', {name: 'I AGREE'}).click();

    await page.locator('input[name="playerID"]').fill(Math.random().toString());
    await page.getByRole('button', {name: 'Enter'}).click();

    await page.getByRole('heading', {name: 'Instruction One'}).waitFor();

    await page.getByRole('button', {name: 'Next'}).click();

    // const timer = page.getByRole('heading', { name: '05:00'});
    const timer = page.getByRole('heading', {name: /\d\d:\d\d/});
    await expect(timer).toBeVisible();

    await test.step('handle slider', async () => {
      const slider = page.locator('input[type="range"]');
      await slider.waitFor();
      const output = page.locator('output');
      const targetNumber = "600";
      let isCompleted = false;
      if (slider) {
        let srcBound = await slider.boundingBox();
        if (srcBound) {
          let xPosition = randomIntFromInterval(srcBound.x, srcBound.width);
          const yPosition = srcBound.y + srcBound.height / 2;
          await page.mouse.move(xPosition, yPosition);
          await page.mouse.down();

          let lowerLimit = srcBound.x;
          let upperLimit = srcBound.x + srcBound.width;

          while (!isCompleted) {
            const outputVal = parseInt(await output.innerText());
            if (outputVal > targetNumber) {
              upperLimit = xPosition;
              xPosition = lowerLimit + (xPosition - lowerLimit)/2;
            } else if (outputVal < targetNumber) {
              lowerLimit = xPosition;
              xPosition = xPosition + (upperLimit - xPosition)/2;
            } else {
              isCompleted = true;
            }
            await page.mouse.move(xPosition, yPosition);
          }
          await page.mouse.up();
        }
      }
    })

    // submit
    await page.getByRole('button', { name: 'Submit' }).click();

    // result page
    // const resultTimer = page.getByRole('heading', { name: '02:00'});
    const resultTimer = page.getByRole('heading', { name: /0\d:\d\d/});
    await expect(resultTimer).toBeVisible();

    const resultHeading = await page.locator('p:has-text("Result")');
    await expect(resultHeading).toBeVisible();

    const resultVal = await page.getByText('9Score').first(); // 9 points
    await expect(resultVal).toBeVisible();

    await page.getByRole('button', { name: 'Submit' }).click();

    // survey
    await page.locator('input[name="age"]').fill('25');
    await page.locator('input[name="gender"]').fill('male');
    await page.getByText('US Bachelor\'s Degree').click();
    await page.locator('textarea[name="strength"]').fill('Very strong');
    await page.locator('textarea[name="fair"]').fill('Absolutely');
    await page.locator('textarea[name="feedback"]').fill('No problems');

    await page.getByRole('button', { name: 'Submit' }).click();

    const finished = page.getByRole('heading', { name: 'finished' });
    await expect(finished).toBeVisible();
  })
});


test('creates experiment for 10 participants', async ({ context, page }) => {
  test.setTimeout(5000);
  await assureNoPendingExperiments(page);

  await test.step('create experiment in admin panel', async () => {
    const adminPage = await context.newPage();
    await adminPage.goto(URL + '/admin');

    await adminPage.waitForLoadState();

    await expect(adminPage).toHaveURL(/.*admin/);

    await expect(adminPage).toHaveTitle('Empirica Admin');

    await test.step('create new treatment for 10 players', async ()=>{
      await adminPage.getByRole('link', { name: 'Treatments' }).click();
      await expect(adminPage).toHaveURL(URL + '/admin/#/treatments');

      if  (await page.getByRole('button', { name: '10 Players playerCount 10' })) {
        return
      }

      await adminPage.getByRole('button', { name: 'New Treatment' }).click();
      await adminPage.getByLabel('Name').fill('10 Players');
      await adminPage.locator('input[type="text"]').nth(1).click();
      await adminPage.locator('input[type="text"]').nth(1).fill('10');
      await adminPage.getByRole('button', { name: 'Save' }).click();
    })

    await adminPage.getByRole('link', { name: 'Batches' }).click();

    await adminPage.getByRole('button', {name: 'New Batch'}).click();

    await adminPage.getByRole('heading', {name: 'New Batch'}).waitFor();

    await adminPage.locator('select').selectOption({label: '10 Players'});

    await adminPage.getByRole('button', {name: 'Create'}).click();

    await adminPage.getByRole('button', {name: 'Start'}).click();
  })

  await test.step('complete experiment as participant', async () => {

    const pages = [];

    for (let i = 0; i <= 9; i++) {
      pages[i] = await context.newPage();
      await pages[i].goto(URL + '/?participantKey=' + i);
      if (i===0) await pages[i].getByRole('button', {name: 'I AGREE'}).click();
      await pages[i].locator('input[name="playerID"]').fill(Math.random().toString());
      await pages[i].getByRole('button', {name: 'Enter'}).click();
      await pages[i].getByRole('heading', {name: 'Instruction One'}).waitFor();
      await pages[i].getByRole('button', {name: 'Next'}).click();

      if (i === 9) {
        await pages[i].getByRole('heading', { name: 'Waiting for other players' }).waitFor();
        await pages[i].getByText('Please wait for the game to be ready.').waitFor();
      }
    }

    // const timer = page.getByRole('heading', { name: '05:00'});
    const timer = page.getByRole('heading', {name: /\d\d:\d\d/});
    await expect(timer).toBeVisible();

    await test.step('handle slider', async () => {
      const slider = page.locator('input[type="range"]');
      await slider.waitFor();
      const output = page.locator('output');
      const targetNumber = "600";
      let isCompleted = false;
      if (slider) {
        let srcBound = await slider.boundingBox();
        if (srcBound) {
          let xPosition = randomIntFromInterval(srcBound.x, srcBound.width);
          const yPosition = srcBound.y + srcBound.height / 2;
          await page.mouse.move(xPosition, yPosition);
          await page.mouse.down();

          let lowerLimit = srcBound.x;
          let upperLimit = srcBound.x + srcBound.width;

          while (!isCompleted) {
            const outputVal = parseInt(await output.innerText());
            if (outputVal > targetNumber) {
              upperLimit = xPosition;
              xPosition = lowerLimit + (xPosition - lowerLimit)/2;
            } else if (outputVal < targetNumber) {
              lowerLimit = xPosition;
              xPosition = xPosition + (upperLimit - xPosition)/2;
            } else {
              isCompleted = true;
            }
            await page.mouse.move(xPosition, yPosition);
          }
          await page.mouse.up();
        }
      }
    })

    // submit
    await page.getByRole('button', { name: 'Submit' }).click();

    // result page
    // const resultTimer = page.getByRole('heading', { name: '02:00'});
    const resultTimer = page.getByRole('heading', { name: /0\d:\d\d/});
    await expect(resultTimer).toBeVisible();

    const resultHeading = await page.locator('p:has-text("Result")');
    await expect(resultHeading).toBeVisible();

    const resultVal = await page.getByText('9Score').first(); // 9 points
    await expect(resultVal).toBeVisible();

    await page.getByRole('button', { name: 'Submit' }).click();

    // survey
    await page.locator('input[name="age"]').fill('25');
    await page.locator('input[name="gender"]').fill('male');
    await page.getByText('US Bachelor\'s Degree').click();
    await page.locator('textarea[name="strength"]').fill('Very strong');
    await page.locator('textarea[name="fair"]').fill('Absolutely');
    await page.locator('textarea[name="feedback"]').fill('No problems');

    await page.getByRole('button', { name: 'Submit' }).click();

    const finished = page.getByRole('heading', { name: 'finished' });
    await expect(finished).toBeVisible();
  })
});
