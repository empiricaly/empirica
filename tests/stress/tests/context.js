import { exec } from "child_process";
import { Admin } from "./admin";
import { Player } from "./player";
import path from "path";

export class Context {
  constructor(browser) {
    this._actors = [];
    this._admins = [];
    this._players = [];
    this._browser = browser;
    this.logRegexes = [];
  }

  async start() {
    this.context = await this._browser.newContext();
    await this.addAdmin();
  }

  async close() {
    await this.context.close();
  }

  get admin() {
    return this._admins[0];
  }

  get admins() {
    return this._admins;
  }

  get players() {
    return this._players;
  }

  logMatching(regex) {
    this.logRegexes.push(regex);
  }

  logMatches(text) {
    return this.logRegexes.some((regex) => regex.test(text));
  }

  async addAdmin(name = "") {
    if (!name) {
      name = `admin${this._admins.length}`;
    }

    const admin = new Admin(this, name);
    this._admins.push(admin);
    await this.add(admin);
  }

  async addPlayers(count) {
    await Promise.all([...Array(count)].map(() => this.addPlayer()));
  }

  async addPlayer(name = "") {
    if (!name) {
      name = `player${this._players.length}`;
    }

    const player = new Player(this, name);
    this._players.push(player);
    await this.add(player);
  }

  async add(actor) {
    if (!this.context) {
      throw new Error("Context not started");
    }

    this._actors.push(actor);
    await actor.start(this.context);
  }

  async applyAdmin(step) {
    await this.admin.apply(step);
  }

  async applyAdmins(step) {
    await applyAll(this.admins, step);
  }

  async applyPlayers(step) {
    await applyAll(this.players, step);
  }

  async expectPlayers(kind, key, value) {
    for (const player of this.players) {
      await player.expect(kind, key, value);
    }
  }

  // Execute a command and return the output
  async exec(cmd) {
    return new Promise((resolve, reject) => {
      let proc;
      proc = exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }
        resolve({ stdout, stderr, exitCode: proc.exitCode });
      });
    });
  }

  // Check if the tajriba file contains a string
  async tajContains(string) {
    const tajfile = path.resolve(
      __dirname,
      "../experiment/.empirica/local/tajriba.json"
    );

    try {
      await this.exec(`cat ${tajfile} | grep ${string}`);
      return true;
    } catch (e) {
      return false;
    }
  }
}

export function applyAll(actors, step) {
  return Promise.all(actors.map((actor) => actor.apply(step)));
}
