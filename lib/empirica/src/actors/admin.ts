import { TajribaAdmin } from "tajriba";
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
import { Batch } from "../models/batch";
import { Game } from "../models/game";
import { Player } from "../models/player";
import { ObjectPool, Pool, PoolTypes } from "../models/pool";
import { Root } from "../models/root";
import { Round } from "../models/round";
import { Stage } from "../models/stage";
import { ScopeManager } from "../scope";

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

export class Admin {
  private emitter: Emitter;
  private amng: ScopeManager;
  private pool: ObjectPool;
  private root: Root | null = null;
  private inited = false;

  constructor(private taj: TajribaAdmin) {
    this.amng = new ScopeManager(taj);
    this.pool = Pool(poolTypes, this.amng);
    this.emitter = new Emitter(taj, this.pool);
  }

  stop() {
    this.taj.stop();
  }

  async init() {
    if (this.inited) {
      console.warn("You shouldn't call init() directly.");
      return;
    }
    this.inited = true;

    const scope = await this.amng.scope("root", "root");
    this.root = new Root(this.pool, scope, "root");
  }

  async createBatch() {
    const batch = <Batch>await this.pool.create("batch");

    const batchIDs = this.root!.getInternal("batchIDs") || [];
    batchIDs.push(batch.id);
    this.root!.setInternal("batchIDs", batchIDs);

    return batch;
  }

  onNewPlayer(cb: EventCallback<PlayerEventArgs>) {
    return this.emitter.on(EmpiricaEvent.NewPlayer, cb);
  }
  onPlayerConnected(cb: EventCallback<PlayerEventArgs>) {
    return this.emitter.on(EmpiricaEvent.PlayerConnected, cb);
  }
  onPlayerDisconnected(cb: EventCallback<PlayerEventArgs>) {
    return this.emitter.on(EmpiricaEvent.PlayerDisonnected, cb);
  }
  onNewBatch(cb: EventCallback<BatchEventArgs>) {
    return this.emitter.on(EmpiricaEvent.NewBatch, cb);
  }
  onGameInit(cb: EventCallback<GameEventArgs>) {
    return this.emitter.on(EmpiricaEvent.GameInit, cb);
  }
  onRoundStart(cb: EventCallback<StageEventArgs>) {
    return this.emitter.on(EmpiricaEvent.RoundStart, cb);
  }
  onStageStart(cb: EventCallback<StageEventArgs>) {
    return this.emitter.on(EmpiricaEvent.StageStart, cb);
  }
  onStageEnd(cb: EventCallback<StageEventArgs>) {
    return this.emitter.on(EmpiricaEvent.StageEnd, cb);
  }
  onRoundEnd(cb: EventCallback<RoundEventArgs>) {
    return this.emitter.on(EmpiricaEvent.RoundEnd, cb);
  }
  onGameEnd(cb: EventCallback<GameEventArgs>) {
    return this.emitter.on(EmpiricaEvent.GameEnd, cb);
  }
  onChange(type: string, key: string, cb: EventCallback<AttrEventArgs>) {
    const t = poolTypes[type];
    if (!t) {
      throw `onChange: unknown type: ${type}`;
    }

    return this.amng.on(type, key, cb);
  }
}
