import { Actor } from "./actor";
import { Step } from "./step";
const { expect } = require("@playwright/test");
import chalk from "chalk";

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

  logWS() {
    this.listenWS({
      received: playerReceivedPrinter(this),
    });
  }
}

export const playerStart = new Step("start", async (actor) => {
  // Fill the form
  actor.info("fill form");
  await actor.page.locator("input#playerID").fill(actor.uniqueID);
  await actor.page.locator(`button[type="submit"]`).click();

  // Wait for the lobby to be visible
  actor.info("signed in");
  await actor.page.getByTestId("game-started").waitFor({ timeout: 3000000 });

  // Wait for the game to start
  actor.info("game started");
  await actor.screenshot("game started");
});

function playerReceivedPrinter(actor) {
  const scopes = new Map();
  const receive = chalk.gray("←");
  const name = chalk.greenBright(`(${actor.name})`.padEnd(10, " "));

  return (ws, payload) => {
    try {
      const msg = JSON.parse(payload);
      if (msg["type"] === "ping" || msg["type"] === "connection_ack") {
        return;
      }

      const data = msg["payload"]["data"];

      if (data["globalAttributes"]) {
        return;
      }

      const changeMD = data["changes"];
      const change = changeMD["change"];

      if (!change) {
        if (changeMD["done"]) {
          console.log(
            receive,
            chalk.green("DON"),
            name,
            actor.currentTS(),
            changeMD["removed"] ? chalk.red("REMOVED") : "",
            "done",
            chalk.green("✔")
          );
        }

        return;
      }

      switch (change["__typename"]) {
        case "AttributeChange":
          console.log(
            receive,
            chalk.cyan.bold("ATT"),
            name,
            actor.currentTS(),
            changeMD["removed"] ? chalk.red("REMOVED") : "",
            scopes.get(change["nodeID"]),
            change["nodeID"].slice(-5),
            change["id"].slice(-5),
            change["key"],
            change["val"],
            changeMD["done"] ? chalk.green("✔") : ""
          );
          break;
        case "ScopeChange":
          scopes.set(change["id"], change["kind"]);
          break;
        case "ParticipantChange":
          console.log(
            receive,
            chalk.blue.bold("PRT"),
            name,
            actor.currentTS(),
            changeMD["removed"] ? chalk.red("REMOVED") : "",
            change["id"].slice(-5),
            changeMD["done"] ? chalk.green("✔") : ""
          );

          return;
        case "StepChange":
          console.log(
            receive,
            chalk.blue.bold("STP"),
            name,
            actor.currentTS(),
            changeMD["removed"] ? chalk.red("REMOVED") : "",
            change["id"].slice(-5),
            change["state"],
            change["remaining"] + change["elapsed"] - change["remaining"],
            "/",
            change["remaining"] + change["elapsed"],
            "seconds",
            changeMD["done"] ? chalk.green("✔") : ""
          );

          return;
        default:
          console.log(receive, "UNKNOWN", change["__typename"], change);
      }
    } catch (e) {
      console.log(receive, "FAIL", payload);
    }
  };
}
