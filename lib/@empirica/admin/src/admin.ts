import { Json } from "./json";
import { Runtime } from "./runtime";
import { changeCallback, Store } from "./store";

export class Admin {
  constructor(private runtime: Runtime, private store: Store) {}

  async createBatch(attr: Json) {
    return await this.runtime.createBatch(attr);
  }

  get batches() {
    return Object.values(this.store.batches);
  }

  get batchesSub() {
    return {
      subscribe: (cb: changeCallback) => this.store.sub("batches", cb),
    };
  }

  async process() {
    await this.runtime.processChanges();
  }

  stop() {
    this.runtime.stop();
  }
}

export function sleep(dur: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, dur);
  });
}
