import Joi from "joi";
import { Scope } from "../scope";
import { Base, BaseC } from "./base";
import { Game, GameC } from "./game";
import { ObjectPool } from "./pool";
import { Stage, StageC } from "./stage";

export class Round extends Base {
  _stages: { [key: string]: Stage } = {};

  constructor(pool: ObjectPool, scope: Scope, id: string) {
    super(pool, scope, id);
    this.children = [
      {
        key: "stageIDs",
        type: "stage",
        field: "_stages",
      },
    ];
  }

  get game(): Game | undefined {
    return this.parentID ? <Game>this.pool.obj(this.parentID) : undefined;
  }

  createCtx(): RoundC {
    return new RoundC(this);
  }

  get stages() {
    return Object.values(this._stages);
  }
}

export class RoundC extends BaseC {
  stages: StageC[] = [];

  get game() {
    return <GameC>this.base?.game?.ctx;
  }

  addStage(name: string, duration: number) {
    Joi.assert(duration, Joi.number().required().integer().min(5));
    Joi.assert(name, Joi.string().required().min(1).max(64));

    const stage = new StageC(name, duration);
    this.stages.push(stage);

    return stage;
  }
}
