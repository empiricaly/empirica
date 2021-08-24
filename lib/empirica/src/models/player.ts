import { Scope } from "../scope";
import { Base, BaseC } from "./base";
import { Game, GameC } from "./game";
import { JsonValue } from "./json";
import { ObjectPool } from "./pool";
import { RoundC } from "./round";
import { Stage, StageC } from "./stage";

export class Player extends Base {
  private bootstraped: boolean = false;

  constructor(pool: ObjectPool, scope: Scope, id: string) {
    super(pool, scope, id);
  }

  bootstrap() {
    if (this.bootstraped) {
      return;
    }
    this.bootstraped = true;

    const gameID = this.getInternal("gameID");
    if (!gameID) {
      return;
    }

    const game = <Game>this.pool.obj(gameID);
    if (!game) {
      return;
    }

    const stageID = game.getInternal("currentStageID");
    if (!stageID) {
      (<PlayerC>this.ctx).setContext(<GameC>game.ctx);
      return;
    }

    const stage = <Stage>this.pool.obj(stageID);
    if (!stage) {
      (<PlayerC>this.ctx).setContext(<GameC>game.ctx);
      return;
    }

    const round = stage.round;
    if (!round) {
      (<PlayerC>this.ctx).setContext(<GameC>game.ctx);
      return;
    }

    (<PlayerC>this.ctx).setContext(
      <GameC>game.ctx,
      <RoundC>round.ctx,
      <StageC>stage.ctx
    );
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

class PlayerGame extends PrefixedAttributes {
  constructor(readonly id: string, bc: BaseC) {
    super(`game-${id}`, bc);
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
  private _game?: PlayerGame;
  private _round?: PlayerRound;
  private _stage?: PlayerStage;

  constructor(base?: Base, game?: GameC, round?: RoundC, stage?: StageC) {
    super(base);

    this.setContext(game, round, stage);
  }

  setContext(game?: GameC, round?: RoundC, stage?: StageC) {
    if (game) {
      this._game = new PlayerGame(game.id, this);
    } else {
      this._game = undefined;
    }
    if (round) {
      this._round = new PlayerRound(round.id, this);
    } else {
      this._round = undefined;
    }
    if (stage) {
      this._stage = new PlayerStage(stage.id, this);
    } else {
      this._stage = undefined;
    }
  }

  get game() {
    return this._game;
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
