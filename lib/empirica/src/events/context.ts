import { Batch } from "../models/batch";
import { ObjectPool } from "../models/pool";
import { Root } from "../models/root";

export class Context {
  // players: PlayerC[] = [];
  // batch?: BatchC;
  // game?: GameC;
  // round?: RoundC;
  // stage?: StageC;

  constructor(private pool: ObjectPool, private root: Root) {}

  async createBatch(attr: Object) {
    const batch = <Batch>await this.pool.create("batch");

    const batchIDs = this.root!.getInternal("batchIDs") || [];
    batchIDs.push(batch.id);
    this.root!.setInternal("batchIDs", batchIDs);

    return batch.ctx;
  }

  get batches() {
    return this.root.batches;
  }

  get allPlayers() {
    return this.pool.objectsOfType("player").map((p) => p.ctx);
  }

  get unassignedPlayers() {
    return this.pool
      .objectsOfType("player")
      .filter((p) => !p.getInternal("gameID"))
      .map((p) => p.ctx);
  }
}
