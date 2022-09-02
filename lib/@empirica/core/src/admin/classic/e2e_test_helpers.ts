import { TajribaAdmin } from "@empirica/tajriba";
import { spawn } from "child_process";
import fs from "fs";
import readline from "readline";
import { z } from "zod";
// import { Globals as PlayerGlobals } from "../../player";
import { EmpiricaClassic, EmpiricaClassicContext } from "../../player/classic";
import { MemStorage, ParticipantSession } from "../../player/connection";
import { ParticipantModeContext } from "../../player/context";
import { TajribaConnection } from "../../shared/tajriba_connection";
import { AdminContext } from "../context";
import type { Subscriber } from "../events";
import { ListenersCollector } from "../events";
import {
  awaitObsValue,
  awaitObsValueChange,
  awaitObsValueExist,
} from "../observables";
import { promiseHandle } from "../promises";
import { Classic } from "./classic";
import { ClassicLoader } from "./loader";
import { ClassicKinds, classicKinds, Context, Game } from "./models";
import { treatmentSchema } from "./schemas";

const VERBOSE = false;

const configFile = "/tmp/.tajriba.toml";
const username = "username";
const password = "password";
const srtoken = "0123456789123456";
const config =
  `
[auth]
srtoken = "` +
  srtoken +
  `"

[[auth.users]]
name = "Nicolas"
username = "` +
  username +
  `"
password = "` +
  password +
  `"
`;

ParticipantSession.storage = MemStorage;

function createTajribaConfigFile() {
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, config);
  }
}

interface TajServer {
  stop: () => void;
  port: number;
}

export async function withTajriba(fn: (port: number) => void) {
  const srv = await startTajriba();
  await fn(srv.port);
  srv.stop();
}

export async function startTajriba(): Promise<TajServer> {
  createTajribaConfigFile();

  const taj = spawn("tajriba", [
    "--config",
    configFile,
    "--log.level",
    "trace",
    "--store.mem",
    "--server.addr",
    ":0",
  ]);

  readline.createInterface({ input: taj.stdout! }).on("line", (data) => {
    console.log(`stdout: ${data}`);
  });

  let portRes: (value: number) => void;
  const portProm = new Promise<number>((r) => {
    portRes = r;
  });

  readline.createInterface({ input: taj.stderr! }).on("line", (data) => {
    try {
      const dat = JSON.parse(data);
      if (
        portRes &&
        dat["message"] &&
        dat["message"] === "Started Tajriba server"
      ) {
        portRes(dat["port"] as number);
      }

      if (VERBOSE || (dat["level"] && dat["level"] === "error")) {
        console.log(`stderr: ${data}`);
      }
    } catch (e) {
      console.error(data.toString());
    }
  });

  taj.on("error", (error) => {
    console.error(`error: ${error.message}`);
  });

  taj.on("close", (code) => {
    if (code) {
      console.log(`child process exited with code ${code}`);
    }
  });

  const port = await portProm;

  let stopped = false;
  return {
    port,
    stop: function stopTajriba() {
      if (!stopped) {
        // console.log("kill", port);
        taj.kill("SIGKILL");
        stopped = true;
      }
    },
  };
}

class Admn {
  constructor(private taj: TajribaConnection, private admin: TajribaAdmin) {}

  stop() {
    this.taj.stop();
    this.admin.stop();
  }

  async getGames() {
    const scopes = await this.admin.scopes({
      filter: [{ kinds: ["game"] }],
      first: 100,
    });

    return scopes?.edges.map((e) => e.node);
  }

  async createBatch(config: any) {
    const batch = await this.admin.addScope({
      kind: "batch",
      attributes: [
        { key: "config", val: JSON.stringify(config), immutable: true },
      ],
    });

    if (!batch) {
      throw "failed to create batch";
    }

    return {
      running: async () => {
        return await this.admin.setAttribute({
          key: "status",
          val: JSON.stringify("running"),
          nodeID: batch.id,
        });
      },
      terminated: async () => {
        return await this.admin.setAttribute({
          key: "status",
          val: JSON.stringify("terminated"),
          nodeID: batch.id,
        });
      },
      games: async () => {
        const allGames = await this.admin.scopes({
          first: 100,
          filter: [{ kinds: ["game"] }],
        });
        const batchID = JSON.stringify(batch.id);
        const games = allGames?.edges.filter((game) =>
          game.node.attributes.edges.find(
            (attr) => attr.node.key === "batchID" && attr.node.val === batchID
          )
        );

        return games?.map((g) => new Gam(g.node));
      },
    };
  }
}

interface Scopy {
  id: string;
}

export class Gam {
  constructor(private scope: Scopy) {}

  get id() {
    return this.scope.id;
  }
}

export class Playrs {
  constructor(private playrs: Playr[]) {}
  [Symbol.iterator]() {
    return this.playrs.values();
  }

  get(index: number) {
    return this.playrs[index];
  }

  get length() {
    return this.playrs.length;
  }

  get globals() {
    return this.playrs.map((p) => p.globals);
  }

  async awaitGlobals(key: string) {
    return await Promise.all(
      this.globals.map((p) => awaitObsValueChange(p.obs(key)))
    );
  }

  get player() {
    return this.playrs.map((p) => p.player);
  }

  async awaitPlayer() {
    return await Promise.all(this.playrs.map((p) => p.awaitPlayer()));
  }

  async awaitPlayerExist() {
    return await Promise.all(this.playrs.map((p) => p.awaitPlayerExists()));
  }

  async awaitPlayerKey(key: string) {
    await Promise.all(this.playrs.map((p) => p.awaitPlayerKey(key)));
  }

  async awaitPlayerKeyExist(key: string) {
    await Promise.all(this.playrs.map((p) => p.awaitPlayerKeyExist(key)));
  }

  get game() {
    return this.playrs.map((p) => p.game);
  }

  async awaitGame() {
    return await Promise.all(this.playrs.map((p) => p.awaitGame()));
  }

  async awaitGameExist() {
    return await Promise.all(this.playrs.map((p) => p.awaitGameExist()));
  }

  get round() {
    return this.playrs.map((p) => p.round);
  }

  async awaitRound() {
    return await Promise.all(this.playrs.map((p) => p.awaitRound()));
  }

  get stage() {
    return this.playrs.map((p) => p.stage);
  }

  async awaitStage() {
    return await Promise.all(this.playrs.map((p) => p.awaitStage()));
  }

  get players() {
    return this.playrs.map((p) => p.players);
  }

  async awaitPlayers() {
    return await Promise.all(this.playrs.map((p) => p.awaitPlayers()));
  }
}

export class Playr {
  private mode?: EmpiricaClassicContext;
  constructor(
    private partCtx: ParticipantModeContext<EmpiricaClassicContext>,
    public ns: string,
    public port: number
  ) {}

  async register(playerIdentifier?: string) {
    this.ns = playerIdentifier || this.ns;
    await this.partCtx.register(this.ns);
    this.mode = await awaitObsValueExist(this.partCtx.mode);

    if (!this.mode) {
      throw new Error("mode undefined");
    }
  }

  stop() {
    this.partCtx.tajriba.stop();
    this.partCtx.stop();
  }

  get globals() {
    return this.partCtx.globals.getValue()!;
  }

  async awaitNextDone() {
    return await awaitObsValueChange(this.partCtx.provider.getValue()!.dones);
  }

  async awaitGlobal(key: string) {
    return await awaitObsValueChange(this.globals.obs(key));
  }

  get player() {
    return this.mode!.player.getValue();
  }

  async awaitPlayerExists() {
    return await awaitObsValueExist(this.mode!.player);
  }

  async awaitPlayer() {
    return await awaitObsValueChange(this.mode!.player);
  }

  async awaitPlayerKey(key: string) {
    const player = await awaitObsValueExist(this.mode!.player);
    return await awaitObsValueChange(player!.obs(key));
  }

  async awaitPlayerKeyExist(key: string) {
    const player = await awaitObsValueExist(this.mode!.player);
    return await awaitObsValueExist(player!.obs(key));
  }

  get game() {
    return this.mode!.game.getValue();
  }

  async awaitGame() {
    return await awaitObsValueChange(this.mode!.game);
  }

  async awaitGameExist() {
    return await awaitObsValueExist(this.mode!.game);
  }

  get round() {
    return this.mode!.round.getValue();
  }

  async awaitRound() {
    return await awaitObsValueChange(this.mode!.round);
  }

  get stage() {
    return this.mode!.stage.getValue();
  }

  async awaitStage() {
    return await awaitObsValueChange(this.mode!.stage);
  }

  get players() {
    return this.mode!.players.getValue();
  }

  async awaitPlayers() {
    return await awaitObsValueChange(this.mode!.players);
  }
}

interface testContext {
  port: number;
  players: Playrs;
  admin: Admn;
  callbacks: AdminContext<Context, ClassicKinds>;
  makePlayer: (ns: string, doNotRegister?: boolean) => Promise<Playr>;
  makeAdmin: () => Promise<Admn>;
  makeCallbacks: (
    listeners?:
      | Subscriber<Context, ClassicKinds>
      | ListenersCollector<Context, ClassicKinds>
  ) => Promise<AdminContext<Context, ClassicKinds>>;
}

const pastNSs: { [key: string]: boolean } = {};
export function getUniqueNS(): string {
  const num = Math.round(Math.random() * 100000).toString();
  if (pastNSs[num]) {
    return getUniqueNS();
  }
  pastNSs[num] = true;

  return num;
}

export async function withContext(
  playerCount: number,
  fn: (res: testContext) => Promise<void>,
  options?: {
    doNotRegisterPlayers?: boolean;
    listeners?:
      | Subscriber<Context, ClassicKinds>
      | ListenersCollector<Context, ClassicKinds>;
  }
) {
  await withTajriba(async (port: number) => {
    const playersProms: Promise<Playr>[] = [];

    for (let i = 0; i < playerCount; i++) {
      playersProms.push(
        makePlayer(port, getUniqueNS(), options?.doNotRegisterPlayers)
      );
    }

    const players: Playr[] = [];
    (await Promise.allSettled(playersProms)).forEach((p) => {
      if (p.status == "fulfilled") {
        players.push(p.value);
      } else {
        console.error(p.reason);
      }
    });

    const admin = await makeAdmin(port);
    const callbacks = await makeCallbacks(port, options?.listeners);

    // await sleep(1000);

    await fn({
      port,
      players: new Playrs(players),
      admin,
      callbacks,
      makeAdmin: makeAdmin.bind(null, port),
      makeCallbacks: makeCallbacks.bind(null, port),
      makePlayer: makePlayer.bind(null, port),
    });

    await callbacks.stop();
    admin.stop();
    for (const player of players) {
      player.stop();
    }
    // console.log("stopped", port);
  });
}

export async function makeCallbacks(
  port: number,
  listeners?:
    | Subscriber<Context, ClassicKinds>
    | ListenersCollector<Context, ClassicKinds>
): Promise<AdminContext<Context, ClassicKinds>> {
  const ctx = await AdminContext.init(
    `http://localhost:${port}/query`,
    `:mem:`,
    "callbacks",
    srtoken,
    {},
    classicKinds
  );

  ctx.register(ClassicLoader);
  ctx.register(Classic);
  if (listeners) {
    ctx.register(listeners);
  }

  const prom = promiseHandle();

  ctx.register(function (_) {
    _.on("ready", function () {
      prom.result();
    });
  });

  await prom.promise;

  return ctx;
}

export async function makeAdmin(port: number) {
  const taj = new TajribaConnection(`http://localhost:${port}/query`);
  await awaitObsValue(taj.connected, true);
  const token = await taj.tajriba.registerService("tests", srtoken);
  const admin = await taj.tajriba.sessionAdmin(token);

  return new Admn(taj, admin);
}

export async function makePlayer(
  port: number,
  ns: string,
  doNotRegisterPlayer?: boolean
) {
  const partCtx = new ParticipantModeContext(
    `http://localhost:${port}/query`,
    ns,
    EmpiricaClassic
  );

  await awaitObsValue(partCtx.tajriba.connected, true);
  await awaitObsValue(partCtx.tajriba.connecting, false);

  const plyr = new Playr(partCtx, ns, port);

  if (!doNotRegisterPlayer) {
    await plyr.register(ns);
  }

  return plyr;
}

type TreatmentSchema = z.infer<typeof treatmentSchema>;
export function completeBatchConfig(
  playerCount: number,
  games: number = 1,
  treatments: TreatmentSchema[] = [{}]
) {
  return {
    kind: "complete",
    config: {
      treatments: treatments.map((t) => ({
        count: games,
        treatment: {
          factors: {
            playerCount: playerCount,
            ...t,
          },
        },
      })),
    },
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function gameInitCallbacks(
  rounds: number = 1,
  stages: number = 1,
  duration: number = 10000
) {
  return function (_: ListenersCollector<Context, ClassicKinds>) {
    _.unique.on("game", "start", (ctx, { game }: { game: Game }) => {
      if (!game.get("start")) {
        return;
      }
      for (let i = 0; i < rounds; i++) {
        const round = game.addRound({});
        for (let i = 0; i < stages; i++) {
          round.addStage({ duration });
        }
      }
    });
  };
}
