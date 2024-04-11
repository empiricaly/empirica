import chalk from "chalk";
import { error } from "./helpers";
import { sleep } from "./utils";

export class Actor {
  constructor(ctx, name, url) {
    this.ctx = ctx;
    this.kind = "Actor";
    this.name = name;
    this.uniqueID = Math.floor(Math.random() * 1e13).toString(36);
    this.url = url(this);
    this.startTime = Date.now();

    this.wsOpen = [];
    this.wsSent = [];
    this.wsReceived = [];
    this.wsClose = [];
    this.matchingRegexes = [];
  }

  async start(context) {
    this.page = await context.newPage();
    this.page.on("console", (msg) => {
      const text = msg.text();

      if (!this.ctx.logMatches(text)) {
        return;
      }

      for (const { regex, cb } of this.matchingRegexes) {
        if (regex.test(text)) {
          cb();
          return;
        }
      }

      console.info(this.msgTypeConsole(msg.type()), text);
    });

    this.page.on("websocket", (ws) => {
      // console.log(`WebSocket opened: ${ws.url()}>`);
      for (const cb of this.wsOpen) {
        cb(ws);
      }

      ws.on("framesent", (event) => {
        for (const cb of this.wsSent) {
          cb(ws, event.payload);
        }
      });
      ws.on("framereceived", (event) => {
        for (const cb of this.wsReceived) {
          cb(ws, event.payload);
        }
      });
      ws.on("close", (ws) => {
        for (const cb of this.wsClose) {
          cb(ws);
        }
      });
    });

    await this.page.goto(this.url);
    console.info(
      chalk.magentaBright(`☄ ${this.name}`),
      chalk.gray(`(${this.kind})`, chalk.gray(`created`))
    );
  }

  async expectLogMatching(regex, cb, options = { wait: 5000, interval: 200 }) {
    const start = Date.now();

    let matched = false;
    this.matchingRegexes.push({
      regex,
      cb: (text) => {
        matched = true;
      },
    });

    await cb();

    while (true) {
      if (matched) {
        return;
      }

      if (Date.now() - start > options.wait) {
        break;
      }

      await sleep(options.interval);
    }

    throw new Error(`log not found ${regex} within ${options.wait}ms`);
  }

  /**
   * Listen to WSs.
   * @param {Object} cbs - Callbacks.
   */
  listenWS({ open, sent, received, close }) {
    if (open) {
      this.wsOpen.push(open);
    }

    if (sent) {
      this.wsSent.push(sent);
    }

    if (received) {
      this.wsReceived.push(received);
    }

    if (close) {
      this.wsClose.push(close);
    }
  }

  async screenshot(suffix) {
    let name = `screenshots/${this.name}`;
    if (this.currentStep) {
      name += ` - ${this.currentStep.name}`;
    }

    if (suffix) {
      name += ` - ${suffix}`;
    }

    await this.page.screenshot({ path: `${name}.png` });
  }

  msgTypeConsole(typ, local = false) {
    let msgType = "";
    switch (typ) {
      case "error":
        msgType = chalk.redBright(`ERR`);
        break;
      case "warning":
        msgType = chalk.yellowBright(`WRN`);
        break;
      case "info":
        msgType = chalk.greenBright(`INF`);
        break;
      default:
        msgType = chalk.gray(`LOG`);
        break;
    }

    let name;
    if (local) {
      name = chalk.greenBright(`(${this.name})`.padEnd(10, " "));
    } else {
      name = chalk.magentaBright(`(${this.name})`.padEnd(10, " "));
    }

    const symbol = chalk.gray(local ? "·" : "»");

    return `${symbol} ${msgType} ${name} ${this.currentTS()} `;
  }

  currentTS() {
    return chalk.gray(
      (Date.now() - this.startTime).toString(10).padStart(8, " ")
    );
  }

  info(...args) {
    console.info(this.msgTypeConsole("info", true), ...args);
  }

  async apply(step) {
    const start = Date.now();
    this.currentStep = step;
    try {
      console.info(
        chalk.gray("⌁"),
        chalk.greenBright(this.name),
        chalk.yellowBright(step.name)
      );
      await step.run(this);
    } catch (err) {
      error(
        `${this.kind} "${this.name}" failed "${step.name}": ${err.message}`
      );
      throw err;
    } finally {
      this.currentStep = null;
    }

    console.info(
      chalk.gray(
        `⌀ ${this.name} ${step.name} - finished in ${Date.now() - start}ms`
      )
    );
  }
}
