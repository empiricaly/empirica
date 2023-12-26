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

    const scopeChangeIcon = chalk.gray("←");
    const name = chalk.greenBright(`(${this.name})`.padEnd(10, " "));

    await this.page.exposeFunction(
      "keyChanged",
      (kind, key, value, scopeExists) => {
        console.log(
          scopeChangeIcon,
          chalk.magenta("KEY"),
          name,
          this.currentTS(),
          scopeExists
            ? chalk.green(` ${kind} ${key}=${value} ✔`)
            : chalk.red(` ${kind} ✘`)
        );
      }
    );

    await this.page.exposeFunction("scopeChanged", (kind, scopeExists) => {
      console.log(
        scopeChangeIcon,
        chalk.blue("SCP"),
        name,
        this.currentTS(),
        scopeExists ? chalk.green(` ${kind} ✔`) : chalk.red(` ${kind} ✘`)
      );
    });
  }

  async listenScope(kind) {
    await this.page.evaluate((kind) => {
      eval("window.empirica_test_collector")[kind].listenScope();
    }, kind);
  }

  async listenKey(kind, key) {
    await this.page.evaluate(
      ({ kind, key }) => {
        eval("window.empirica_test_collector")[kind].listenKey(key);
      },
      { kind, key }
    );
  }

  async get(kind, key) {
    return await this.page.evaluate(
      ({ kind, key }) => eval("window.empirica_test_collector")[kind].get(key),
      { kind, key }
    );
  }

  async set(kind, key, value) {
    await this.page.evaluate(
      ({ kind, key, value }) => {
        eval("window.empirica_test_collector")[kind].set(key, value);
      },
      { kind, key, value }
    );
  }

  async expect(kind, key, value) {
    const val = JSON.stringify(await this.get(kind, key));
    const valueJSON = JSON.stringify(value);
    if (val !== valueJSON) {
      throw new Error(
        `value was not as expected, expected: ${valueJSON}, got: ${val}`
      );
    }
  }

  // mutObj is a special function that allows to mutate an object at key in
  // place (without overwriting the whole object). This is to trigger a case,
  // where the value is not updated correctly, because equality check is done on
  // the object reference, not the content.
  // The value at key must of course be an object. This is only really useful
  // for this one test.
  async mutObj(kind, key, k, v) {
    await this.page.evaluate(
      ({ kind, key, k, v }) => {
        const record = eval("window.empirica_test_collector")[kind];
        const myobject = record.get(key);
        myobject[k] = v;
        record.set(key, myobject);
      },
      { kind, key, k, v }
    );
  }

  logWS() {
    this.listenWS({
      received: playerReceivedPrinter(this),
    });
  }

  listen() {
    return Math.floor(Date.now() / 1000);
  }
}

export const playerStart = new Step("start game", async (actor) => {
  // Fill the form
  actor.info("fill form");
  await actor.page.locator("input#playerID").fill(actor.uniqueID);
  await actor.page.locator(`button[type="submit"]`).click();

  // Wait for first stage to be visible
  actor.info("signed in");
  await actor.page.getByTestId("stage-ongoing").waitFor({ timeout: 3000000 });

  actor.info("game started");
  await actor.screenshot("game started");
});

export const submitStage = new Step("submit stage", async (actor) => {
  await actor.page.getByTestId("submit-stage").click();
  await actor.page.getByTestId("submitted").waitFor({ timeout: 1000 });
});

export const waitNextStage = new Step("wait next stage", async (actor) => {
  await actor.page.getByTestId("stage-ongoing").waitFor({ timeout: 100000 });
});

export const waitGameFinished = new Step(
  "wait game finished",
  async (actor) => {
    await actor.page.getByTestId("game-finished").waitFor({ timeout: 100000 });
  }
);

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
