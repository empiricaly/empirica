import { Json } from "./json";
import { Runtime } from "./runtime";

export class Admin {
  constructor(private runtime: Runtime) {}

  stop() {
    this.runtime.stop();
  }

  async createBatch(attr: Json) {
    return await this.runtime.createBatch(attr);
  }
}
