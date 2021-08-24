import { Scope } from "../scope";
import { Base } from "./base";
import { Batch } from "./batch";
import { ObjectPool } from "./pool";

export class Root extends Base {
  _batches: { [key: string]: Batch } = {};
  children = [
    {
      key: "batchIDs",
      type: "batch",
      field: "_batches",
    },
  ];

  constructor(pool: ObjectPool, scope: Scope, id: string) {
    super(pool, scope, id);
    this.init();
  }

  batch(id: string) {
    return this._batches[id];
  }

  get batches() {
    return Object.values(this._batches);
  }
}
