import { Json } from "./json";
import { Runtime } from "./runtime";

export class Admin {
  constructor(private runtime: Runtime) {}

  async createBatch(attr: Json) {
    return await this.runtime.createBatch(attr);
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
