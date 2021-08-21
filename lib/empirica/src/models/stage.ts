import { Scope } from "../scope";
import { Base, BaseC } from "./base";
import { ObjectPool } from "./pool";
import { Round, RoundC } from "./round";

export class Stage extends Base {
  constructor(pool: ObjectPool, scope: Scope, id: string) {
    super(pool, scope, id);
    const stepID = this.getInternal("stepID");
    if (stepID) {
      pool.registerObjectStep(stepID, this);
    }
  }

  get round(): Round | undefined {
    return this.parentID ? <Round>this.pool.obj(this.parentID) : undefined;
  }

  setStepID(stepID: string) {
    this.setInternal("stepID", stepID);
    this.pool.registerObjectStep(stepID, this);
  }

  createCtx(): StageC {
    const duration = this.getInternal("duration") || 30;
    const name = this.getInternal("name") || "";
    return new StageC(name, duration, this);
  }
}

export class StageC extends BaseC {
  constructor(public name: string, public duration: number, base?: Stage) {
    super(base);
  }

  get round() {
    return <RoundC>this.base?.round?.ctx;
  }
}
