// @ts-check
const { test, expect } = require("@playwright/test");

test("has title", async ({ browser }) => {
  const context = await browser.newContext();

  const page = await context.newPage();
  await page.goto("http://localhost:3000/admin");
  await expect(page).toHaveTitle(/Empirica Admin/);

  await page.getByTestId("newBatchButton").click();
  const treatmentSelect = page.getByTestId("treatmentSelect");

  const val1 = await treatmentSelect.first().inputValue();

  await treatmentSelect.selectOption({
    label: "Experiment",
  });

  await page.getByTestId("createBatchButton").click();

  await page.mainFrame().waitForFunction("window.lastNewBatch");

  const lastNewBatch = await page.evaluate(() => window.lastNewBatch);
  console.log("lastNewBatch", lastNewBatch);

  const selector = `li[data-batch-line-id=${lastNewBatch}]`;
  await page.mainFrame().waitForSelector(selector);

  const htlm = await page.locator(selector).innerHTML();

  console.log("htlm", htlm);

  await context.close();
});

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();

//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });/home/npaton/projects/empirica/core/empirica/tests/stress/myexperiment
