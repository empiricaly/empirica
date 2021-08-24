import { EventEmitter } from "events";
import {
  Attribute as Attr,
  Scope as Scp,
  ScopedAttributesPayload,
  TajribaAdmin,
  TajribaParticipant,
} from "tajriba";
import { AttrEventArgs, EventCallback } from "./events/events";
import { Attribute, AttributeOptions } from "./models/attribute";

export const internalPrefix = "ei";
export const internalKey = (k: string) => `${internalPrefix}:${k}`;

export class ScopeManager {
  private emitter: EventEmitter;
  private scopes: { [key: string]: Scope } = {};

  constructor(private taj: TajribaAdmin | TajribaParticipant) {
    this.emitter = new EventEmitter();
  }

  on(type: string, key: string, cb: EventCallback<AttrEventArgs>) {
    this.emitter.on(`${type}-${key}`, cb);
  }

  async scope(type: string, name: string) {
    if (!this.scopes[name]) {
      await this.fetch(type, name);
    }

    return this.scopes[name];
  }

  private async fetch(type: string, name: string) {
    if (!(this.taj instanceof TajribaAdmin)) {
      return;
    }

    let scp: Scp;
    const arg = { name };
    const filter = [arg];

    try {
      scp = <Scp>await this.taj.addScope(arg);
    } catch (err) {
      if (!err.message.includes("already exists")) {
        throw err;
      }

      try {
        const scopes = await this.taj.scopes({ filter, first: 1 });
        if (
          !scopes ||
          scopes.totalCount == 0 ||
          !scopes.edges ||
          !scopes.edges[0]
        ) {
          throw "scope creation failed";
        }

        scp = <Scp>scopes.edges[0].node;
      } catch (err) {
        console.error("failed to fetch scope");
        console.error(err);

        throw err;
      }
    }

    await this.add(type, scp);
  }

  private async add(type: string, scp: Scp) {
    const scope = new Scope(
      scp.id,
      scp.name,
      this.taj,
      (attr: Attribute, isNew: boolean, isInit: boolean) => {
        let k = attr.key;
        if (k.includes(":") && !k.startsWith("ei:") && !k.endsWith(":")) {
          k = k.split(":")[1];
        }
        const name = `${type}-${k}`;
        this.emitter.emit(name, { attr, isNew, isInit });
      }
    );
    this.scopes[scp.name] = scope;

    await scope.ready();

    return scope;
  }
}

export class Scope {
  private syncing: boolean = false;
  private initialized: boolean = false;
  private attrs: { [key: string]: Attribute } = {};
  private done: boolean = false;
  private dones: ((value: unknown) => any)[] = [];

  constructor(
    public id: string,
    public name: string,
    private taj: TajribaAdmin | TajribaParticipant,
    private onChange?: (
      attr: Attribute,
      isNew: boolean,
      isInit: boolean
    ) => void
  ) {
    // Disable syncing for Participant
    if (taj instanceof TajribaParticipant) {
      this.syncing = true;
      this.done = true;
    }
  }

  async ready() {
    if (this.done) {
      return true;
    }
    this.sync();

    const p = new Promise((resolve) => {
      this.dones.push(resolve);
    });

    return p;
  }

  private async sync() {
    if (this.syncing) {
      return;
    }
    this.syncing = true;

    if (this.taj instanceof TajribaParticipant) {
      throw new Error("not authorized");
    }

    this.taj.scopedAttributes([{ name: this.name }], this.attrCB.bind(this));

    return;
  }

  attrCB(payload: ScopedAttributesPayload, err: Error | undefined) {
    if (err) {
      console.error("attrCB", err);
      return;
    }

    const { attribute, done, isNew } = payload;

    if (attribute) {
      this.updateAttr(attribute, isNew);
    }

    this.markDone(done);
  }

  markDone(done: boolean) {
    if (done) {
      for (const f of this.dones) {
        f(true);
      }
    }

    this.done = done;
    if (done) {
      this.initialized = true;
    }
  }

  updateAttr(at: Attr, isNew: boolean) {
    let a = this.attrs[at.key];
    if (a) {
      a.update(at);
    } else {
      a = new Attribute(this.taj, at);
      this.attrs[at.key] = a;
    }

    this.onChange && this.onChange(a, isNew, !this.initialized);
  }

  get keys() {
    return Object.keys(this.attrs);
  }

  get(key: string) {
    let attr = this.attrs[key];
    if (!attr) {
      attr = new Attribute(this.taj, null, key, this.id);
      this.attrs[key] = attr;
    }

    return attr.value;
  }

  sub(key: string) {
    let attr = this.attrs[key];
    if (!attr) {
      attr = new Attribute(this.taj, null, key, this.id);
      this.attrs[key] = attr;
    }

    return attr.readable;
  }

  set(key: string, val: any, ao?: Partial<AttributeOptions>) {
    let attr = this.attrs[key];
    if (!attr) {
      // console.log("SET", this.id);
      attr = new Attribute(this.taj, null, key, this.id);
      this.attrs[key] = attr;
    }

    attr.set(val, ao);
  }
}
