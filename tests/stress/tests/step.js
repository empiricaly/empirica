export class Step {
  constructor(name, fn) {
    this.name = name;
    this.fn = fn;
  }

  async run(actor) {
    await this.fn(actor);
  }
}
