import { TajribaAdmin } from "tajriba";
import { Context } from "../events/context";
import { Emitter } from "../events/emitter";
import {
  AttrEventArgs,
  BatchEventArgs,
  EmpiricaEvent,
  EventCallback,
  GameEventArgs,
  PlayerEventArgs,
  RoundEventArgs,
  StageEventArgs,
} from "../events/events";
import { Runtime } from "../events/runtime";
import { Batch, BatchC } from "../models/batch";
import { Game, GameC } from "../models/game";
import { Player, PlayerC } from "../models/player";
import { ObjectPool, Pool, PoolTypes } from "../models/pool";
import { Root } from "../models/root";
import { Round, RoundC } from "../models/round";
import { Stage, StageC } from "../models/stage";
import { internalKey, ScopeManager } from "../scope";

interface AdminInit<T extends Admin> {
  new (taj: TajribaAdmin): T;
}

export async function NewAdmin<T extends Admin>(
  admin: AdminInit<T>,
  taj: TajribaAdmin
) {
  const a = new admin(taj);
  await a.init();
  return a;
}

const poolTypes: PoolTypes = {
  batch: Batch,
  game: Game,
  round: Round,
  stage: Stage,
  player: Player,
};

type OnChangeTypeKeys = "player" | "batch" | "game" | "round" | "stage";
type OnChangeType =
  | OnChangeTypeKeys
  | "player-game"
  | "player-round"
  | "player-stage";

const validChangeTypes: { [key: string]: boolean } = {
  batch: true,
  game: true,
  round: true,
  stage: true,
  player: true,
  "player-game": true,
  "player-round": true,
  "player-stage": true,
};

export class Admin {
  private emitter: Emitter | null = null;
  private context: Context | null = null;
  private runtime: Runtime | null = null;
  private amng: ScopeManager;
  private pool: ObjectPool;
  private root: Root | null = null;
  private inited = false;

  constructor(private taj: TajribaAdmin) {
    this.amng = new ScopeManager(taj);
    this.pool = Pool(poolTypes, this.amng);
  }

  stop() {
    this.taj.stop();
  }

  async init() {
    if (this.inited) {
      return;
    }

    this.inited = true;

    const scope = await this.amng.scope("root", "root");
    this.root = new Root(this.pool, scope, "root");

    this.context = new Context(this.pool, this.root);
    this.emitter = new Emitter(this.taj, this.context);
    this.runtime = new Runtime(
      this.taj,
      this.pool,
      this.emitter!,
      this.context
    );
  }

  async createBatch(attr: Object) {
    return await this.context!.createBatch(attr);
  }

  onNewPlayer(cb: EventCallback<PlayerEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.NewPlayer, cb);
  }
  onPlayerConnected(cb: EventCallback<PlayerEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.PlayerConnected, cb);
  }
  onPlayerDisconnected(cb: EventCallback<PlayerEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.PlayerDisonnected, cb);
  }
  onNewBatch(cb: EventCallback<BatchEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.NewBatch, cb);
  }
  onGameInit(cb: EventCallback<GameEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.GameInit, cb);
  }
  onRoundStart(cb: EventCallback<StageEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.RoundStart, cb);
  }
  onStageStart(cb: EventCallback<StageEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.StageStart, cb);
  }
  onStageEnd(cb: EventCallback<StageEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.StageEnd, cb);
  }
  onRoundEnd(cb: EventCallback<RoundEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.RoundEnd, cb);
  }
  onGameEnd(cb: EventCallback<GameEventArgs>) {
    return this.emitter!.on(EmpiricaEvent.GameEnd, cb);
  }
  onChange(type: OnChangeType, key: string, cb: EventCallback<AttrEventArgs>) {
    let tt = type;
    if (
      type === "player-game" ||
      type === "player-round" ||
      type === "player-stage"
    ) {
      tt = "player";
    }

    return this.amng.on(tt, key, ({ attr, isNew, isInit }) => {
      if (isInit) {
        return;
      }

      const args: AttrEventArgs = { attr, isNew, isInit };
      const node = this.pool.scpIDObj(attr.nodeID);

      if (node) {
        switch (type) {
          case "player-game": {
            const player = <Player>node;
            player.bootstrap();

            const playerC = <PlayerC>node.ctx;
            args["player"] = playerC;

            const parts = attr.key.split(":")[0].split("-");
            if (parts.length !== 2) {
              throw `invalid player-game attr key: ${attr.key}`;
            }

            const k = parts[0];
            if (k !== "game") {
              return;
            }

            const id = parts[1];
            const nodeB = this.pool.obj(id);

            if (nodeB) {
              args["game"] = <GameC>nodeB.ctx;
            }

            break;
          }
          case "player-round": {
            const player = <Player>node;
            player.bootstrap();

            const playerC = <PlayerC>node.ctx;
            args["player"] = playerC;

            const parts = attr.key.split(":")[0].split("-");
            if (parts.length !== 2) {
              throw `invalid player-round attr key: ${attr.key}`;
            }

            const k = parts[0];
            if (k !== "round") {
              return;
            }

            const id = parts[1];
            const nodeB = this.pool.obj(id);

            if (nodeB) {
              args["round"] = <RoundC>nodeB.ctx;
            }

            break;
          }
          case "player-stage": {
            const player = <Player>node;
            player.bootstrap();

            const playerC = <PlayerC>node.ctx;
            args["player"] = playerC;

            const parts = attr.key.split(":")[0].split("-");
            if (parts.length !== 2) {
              throw `invalid player-stage attr key: ${attr.key}`;
            }

            const k = parts[0];
            if (k !== "stage") {
              return;
            }

            const id = parts[1];
            const nodeB = this.pool.obj(id);

            if (nodeB) {
              args["stage"] = <StageC>nodeB.ctx;
            }

            break;
          }
          case "player":
            const player = <Player>node;
            player.bootstrap();

            const playerC = <PlayerC>node.ctx;
            args["player"] = playerC;

            break;
          case "batch":
            args["batch"] = <BatchC>node.ctx;
            break;
          case "game":
            args["game"] = <GameC>node.ctx;
            break;
          case "round":
            args["round"] = <RoundC>node.ctx;
            break;
          case "stage":
            args["stage"] = <StageC>node.ctx;
            break;
          default:
            throw `missing attribute node type in change callback: ${type}`;
        }
      }

      cb(args);
      this.runtime!.processChanges();
    });
  }
  onInternalChange(
    type: OnChangeType,
    key: string,
    cb: EventCallback<AttrEventArgs>
  ) {
    return this.onChange(type, internalKey(key), cb);
  }
}
