import { Scope } from "../scope";
import { Base } from "./base";
import { Batch } from "./batch";
import { ObjectPool } from "./pool";

export class Root extends Base {
  _batches: { [key: string]: Batch } = {};

  constructor(pool: ObjectPool, scope: Scope, id: string) {
    super(pool, scope, id);
    this.children = [
      {
        key: "batchIDs",
        type: "batch",
        field: "_batches",
      },
    ];
  }

  batch(id: string) {
    return this._batches[id];
  }

  get batches() {
    return Object.values(this._batches);
  }
}
