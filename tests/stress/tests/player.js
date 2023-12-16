import { Actor } from "./actor";
import { Step } from "./step";
const { expect } = require("@playwright/test");

export class Player extends Actor {
  constructor(ctx, name) {
    super(
      ctx,
      name,
      (self) => `http://localhost:3000/?participantKey=${self.uniqueID}`
    );
    this.kind = "Player";
  }

  async start(context) {
    await super.start(context);
    await expect(this.page).toHaveTitle(/Empirica Experiment/);

    const consent = await this.page.evaluate(
      () => localStorage["empirica:consent"]
    );

    if (consent !== "true") {
      this.info(`consent`);
      await this.page.evaluate(() => (localStorage["empirica:consent"] = true));
      await this.page.reload();
    }

    await expect(
      this.page.getByRole("heading", { name: "No experiments available" })
    ).toBeVisible();
  }
}

export const playerStart = new Step("start", async (actor) => {
  // Fill the form
  actor.info("fill form");
  await actor.page.locator("input#playerID").fill(actor.uniqueID);
  await actor.page.locator(`button[type="submit"]`).click();

  // Wait for the lobby to be visible
  actor.info("signed in");
  // const waiting = actor.page.getByText("Waiting for other players");
  // await waiting.waitFor();
  // actor.info("waiting for other players");
  // // Wait for the lobby to be gone
  // await expect(waiting).toHaveCount(0, { timeout: 20000 });
  // actor.info("game starting");
  // await actor.screenshot("game starting");
  await actor.page.getByTestId("game-started").waitFor({ timeout: 20000 });
  actor.info("game started");
  await actor.screenshot("game started");

  // await actor.page.getByText("Game started").waitFor();
});
