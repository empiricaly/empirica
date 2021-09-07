import { Runtime } from "./runtime";

export class Admin {
  constructor(private runtime: Runtime) {}

  stop() {
    this.runtime.stop();
  }

  async createBatch(attr: Object) {
    return await this.runtime.createBatch(attr);
  }
}
