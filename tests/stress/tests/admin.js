import { Actor } from "./actor";
import { Step } from "./step";
const { expect } = require("@playwright/test");

export class Admin extends Actor {
  constructor(ctx, name) {
    super(ctx, name, () => "http://localhost:3000/admin");
    this.kind = "Admin";
  }

  async start(context) {
    await super.start(context);
    await expect(this.page).toHaveTitle(/Empirica Admin/);
    await expect(
      this.page.getByRole("heading", { name: "Batches" })
    ).toBeVisible();
  }
}

export function completeAssignment(treatments) {
  return {
    kind: "complete",
    config: {
      treatments,
    },
  };
}

export function completeTreatment(name, factors, count) {
  return {
    treatment: {
      name,
      factors,
    },
    count,
  };
}

export function quickGame(playerCount, roundCount, stageCount, factors = {}) {
  return completeAssignment([
    completeTreatment(
      "quick",
      { ...factors, playerCount, roundCount, stageCount },
      1
    ),
  ]);
}

/**
 * @param {Object} params Information about the user.
 * @param {string} [params.treatmentName] The name of the user.
 * @param {Object} [params.treatmentConfig] The email of the user.
 * @param {number} [params.gameCount] The email of the user.
 */
export const adminNewBatch = ({
  treatmentName = "10player",
  treatmentConfig = null,
  gameCount = 1,
}) =>
  new Step("new batch", async (actor) => {
    // Open the new batch dialog
    await actor.page.getByTestId("newBatchButton").click();

    if (treatmentConfig !== null) {
      // Fill in a custom treatment
      await actor.page.getByTestId("customAssignmentButton").click();
      await actor.page
        .getByTestId("configurationTextArea")
        .fill(JSON.stringify(treatmentConfig));
      await actor.screenshot("custom-treatment");

      // Marking for the batch to be created with just the config
      // in the textarea, without wrapping with kind=custom.
      await actor.page.evaluate(() => {
        window["rawCustomConfig"] = true;
      });
    } else {
      // Select the treatment
      await actor.page
        .getByTestId("treatmentSelect")
        .selectOption({ label: treatmentName });

      // Optionally set the game count
      if (gameCount && gameCount > 1) {
        await actor.page
          .locator('[data-test="gameCountInput"]')
          .first()
          .click();
        await actor.page
          .locator('[data-test="gameCountInput"]')
          .first()
          .press("Meta+a");
        await actor.page
          .locator('[data-test="gameCountInput"]')
          .first()
          .fill(`${gameCount}`);
      }
    }

    // Create the batch
    await actor.page.getByTestId("createBatchButton").click();

    // Wait for the batch to be created and get it
    await actor.page.mainFrame().waitForFunction("window.lastNewBatch");
    const lastNewBatch = await actor.page.evaluate(
      () => window["lastNewBatch"]
    );

    // This shouldn't happen, but just in case...
    if (!lastNewBatch) {
      throw new Error("lastNewBatch not found");
    }

    console.log(`LAST BATCH ID: ${lastNewBatch.id}`);

    // Get the line of the last batch
    const lineSelector = `li[data-batch-line-id="${lastNewBatch.id}"]`;
    const line = actor.page.locator(lineSelector);

    // Click the Start button
    const startButtonSelector = `button[data-test="startButton"]`;
    // await line.waitForSelector(startButtonSelector);
    await line.locator(startButtonSelector).click();

    // Check that the batch has started
    await expect(line.getByTestId("stopButton")).toBeVisible();
    await expect(line.getByText("Running")).toBeVisible();

    await actor.page.reload();
  });
