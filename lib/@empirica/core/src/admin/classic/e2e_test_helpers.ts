import { spawn } from "child_process";
import fs from "fs";
import readline from "readline";
import { Observable } from "rxjs";
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
import { Classic } from "./classic";
import { ClassicLoader } from "./loader";
import { ClassicKinds, classicKinds, Context } from "./models";
import { treatmentSchema } from "./schemas";

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
    console.log(`stdout:\n${data}`);
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

interface Adm {
  createBatch: (config: any) => Promise<{
    running: () => void;
    terminated: () => void;
  }>;
}

class Playrs {
  constructor(private playrs: Playr[]) {}
  [Symbol.iterator]() {
    return this.playrs.values();
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

  get game() {
    return this.playrs.map((p) => p.game);
  }

  async awaitGame() {
    return await Promise.all(this.playrs.map((p) => p.awaitGame()));
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

class Playr {
  private mode?: EmpiricaClassicContext;
  constructor(
    private partCtx: ParticipantModeContext<EmpiricaClassicContext>
  ) {}

  async register(playerIdentifier: string) {
    await this.partCtx.register(playerIdentifier);
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
    return this.mode!.globals.getValue();
  }

  async awaitGlobal(key: string) {
    return await awaitObsValueChange(this.globals.obs(key));
  }

  get player() {
    return this.mode!.player.getValue();
  }

  async awaitPlayer() {
    return await awaitObsValueChange(this.mode!.player);
  }

  get game() {
    return this.mode!.game.getValue();
  }

  async awaitGame() {
    return await awaitObsValueChange(this.mode!.game);
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
  players: Playrs;
  admin: Adm;
  callbacks: AdminContext<Context, ClassicKinds>;
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
    // console.log("CONN", port, playerCount);
    const playersProms: Promise<Playr>[] = [];

    for (let i = 0; i < playerCount; i++) {
      playersProms.push(
        makePlayer(port, i.toString(), options?.doNotRegisterPlayers)
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

    await fn({ players: new Playrs(players), admin, callbacks });

    await callbacks.stop();
    admin.stop();
    for (const player of players) {
      player.stop();
    }
    // console.log("stopped", port);
  });
}

async function makeCallbacks(
  port: number,
  listeners:
    | Subscriber<Context, ClassicKinds>
    | ListenersCollector<Context, ClassicKinds>
    | undefined
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

  let res: (value: boolean) => void;
  const prom = new Promise<boolean>((r) => {
    res = r;
  });

  ctx.register(function (_) {
    _.on("ready", function () {
      res(true);
    });
  });

  await prom;

  return ctx;
}

async function makeAdmin(port: number) {
  const taj = new TajribaConnection(`http://localhost:${port}/query`);
  await awaitObsValue(taj.connected, true);
  const token = await taj.tajriba.registerService("tests", srtoken);
  const admin = await taj.tajriba.sessionAdmin(token);

  return {
    stop() {
      taj.stop();
      admin.stop();
    },
    createBatch: async (config: any) => {
      let batch: any;
      try {
        batch = await admin!.addScope({
          kind: "batch",
          attributes: [
            { key: "config", val: JSON.stringify(config), immutable: true },
          ],
        });
      } catch (e) {
        console.error("HERE", e);
      }

      if (!batch) {
        throw "failed to create batch";
      }

      return {
        async running() {
          return await admin!.setAttribute({
            key: "status",
            val: JSON.stringify("running"),
            nodeID: batch.id,
          });
        },
        async terminated() {
          return await admin!.setAttribute({
            key: "status",
            val: JSON.stringify("terminated"),
            nodeID: batch.id,
          });
        },
      };
    },
  };
}

async function makePlayer(
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

  const plyr = new Playr(partCtx);

  if (!doNotRegisterPlayer) {
    await plyr.register(ns);
  }

  return plyr;
}

type TreatmentSchema = z.infer<typeof treatmentSchema>;
export function completeBatchConfig(
  playerCount: number,
  treatments: TreatmentSchema = {}
) {
  return {
    kind: "complete",
    config: {
      treatments: [
        {
          count: 1,
          treatment: {
            factors: {
              playerCount: playerCount,
              ...treatments,
            },
          },
        },
      ],
    },
  };
}
