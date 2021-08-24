import { newID } from "tajriba";
import { internalKey, Scope } from "../scope";
import { AttributeOptions } from "./attribute";
import { Json, JsonValue } from "./json";
import { ObjectPool } from "./pool";

export class Base {
  protected children: {
    key: string;
    type: string;
    field: string;
  }[] = [];
  public ctx: BaseC;
  public parentID?: string;

  [key: string]: any;

  constructor(
    readonly pool: ObjectPool,
    public scope: Scope,
    protected _id: string
  ) {
    this.ctx = this.createCtx();
  }

  protected init() {
    for (const child of this.children) {
      this.scope.sub(internalKey(child.key)).subscribe(async (ids) => {
        this.updateIDs(ids || [], child.field, child.type);
      });
    }
  }

  async updateIDs(
    ids: string[],
    field: string,
    typ: string
  ): Promise<[string[], string[], boolean]> {
    let hasNew = false;
    const newIDs = [];

    for (const id of ids) {
      if (this[field][id]) {
        continue;
      }

      hasNew = true;

      const newObj = await this.pool.object(typ, id);
      if (newObj) {
        newObj.parentID = this.id;
        this[field][id] = newObj;
        newIDs.push(id);
      } else {
        console.warn("base: unable to fetch scope object", id);
      }
    }

    return [Object.keys(this[field]), newIDs, hasNew];
  }

  createCtx(): BaseC {
    return new BaseC(this);
  }

  queueChange() {
    this.pool.queueChange(this.ctx);
  }

  get id() {
    return this._id;
  }

  get keys() {
    return this.scope.keys;
  }

  get(key: string) {
    return this.scope.get(key);
  }

  sub(key: string) {
    return this.scope.sub(key);
  }

  set(key: string, val: any, ao?: Partial<AttributeOptions>) {
    this.scope.set(key, val, ao);
  }

  getInternal(key: string) {
    return this.scope.get(internalKey(key));
  }

  subInternal(key: string) {
    return this.scope.sub(internalKey(key));
  }

  setInternal(key: string, val: any, immutable: boolean = false) {
    this.scope.set(internalKey(key), val, { immutable });
  }
}

export class BaseC {
  _ks: Json = {};
  _kopts: { [key: string]: Partial<AttributeOptions> } = {};
  protected _id: string = "";

  [key: string]: any;

  constructor(public base?: Base) {
    if (!base) {
      this._id = newID();
    } else {
      this._id = base.id;
    }
  }

  get id() {
    return this._id;
  }

  queueChange() {
    this.base?.queueChange();
  }

  get(key: string) {
    if (key in this._ks) {
      return this._ks[key];
    }

    if (this.base) {
      return this.base.get(key);
    }

    return;
  }

  set(key: string, value: JsonValue, ao?: Partial<AttributeOptions>) {
    if (key.startsWith("ei:")) {
      throw new Error(`key starting with 'ei:' is forbidden`);
    }

    this._ks[key] = value;

    if (ao) {
      this._kopts[key] = ao;
    }

    this.queueChange();
  }
}
