import { Scope } from "../scope";
import { Base, BaseC } from "./base";
import { JsonValue } from "./json";
import { ObjectPool } from "./pool";
import { RoundC } from "./round";
import { StageC } from "./stage";

export class Player extends Base {
  constructor(pool: ObjectPool, scope: Scope, id: string) {
    super(pool, scope, id);
  }

  createCtx(): PlayerC {
    return new PlayerC(this);
  }
}

class PrefixedAttributes {
  constructor(private prefix: string, private bc: BaseC) {}

  get(key: string) {
    return this.bc.get(`${this.prefix}:${key}`);
  }

  set(key: string, value: JsonValue) {
    if (key.startsWith("ei:")) {
      throw new Error(`key starting with 'ei:' is forbidden`);
    }

    this.bc.set(`${this.prefix}:${key}`, value);
  }
}

class PlayerRound extends PrefixedAttributes {
  constructor(readonly id: string, bc: BaseC) {
    super(`round-${id}`, bc);
  }
}
class PlayerStage extends PrefixedAttributes {
  constructor(readonly id: string, bc: BaseC) {
    super(`stage-${id}`, bc);
  }
}

export class PlayerC extends BaseC {
  private _round?: PlayerRound;
  private _stage?: PlayerRound;

  constructor(base?: Base, round?: RoundC, stage?: StageC) {
    super(base);
    if (round) {
      this._round = new PlayerRound(round.id, this);
    }
    if (stage) {
      this._stage = new PlayerStage(stage.id, this);
    }
  }

  get game() {
    const gameID = this.base?.getInternal("gameID");
    if (gameID) {
      return this.base?.pool.obj(gameID) || gameID;
    }

    return null;
  }

  get round() {
    if (!this._round) {
      throw new Error("player not in round context");
    }

    return this._round;
  }

  get stage() {
    if (!this._stage) {
      throw new Error("player not in stage context");
    }

    return this._stage;
  }
}
