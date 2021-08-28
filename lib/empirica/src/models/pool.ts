import { EventEmitter } from "events";
import { newID, Scope as Scp } from "tajriba";
import { Scope, ScopeManager } from "../scope";
import { Base, BaseC } from "./base";

interface PoolConstructable {
  new (pool: ObjectPool, scope: Scope, id: string, parentID?: string): Base;
}

export type PoolTypes = { [key: string]: PoolConstructable };

export enum PoolEvent {
  Added = "Added",
  Removed = "Removed",
  Created = "Created",
}

export function Pool(
  types: PoolTypes,
  mng: ScopeManager | null = null
): ObjectPool {
  if (mng instanceof ScopeManager) {
    return new AdminPool(mng, types);
  }

  return new ParticipantPool(types);
}

export abstract class ObjectPool {
  private objs: { [key: string]: Base } = {};
  private objsByScopeID: { [key: string]: Base } = {};
  private stepObjs: { [key: string]: Base } = {};
  private objsByType: { [key: string]: Base[] } = {};
  private changeQueue: BaseC[] = [];
  private emitter: EventEmitter;

  constructor(private types: { [key: string]: PoolConstructable }) {
    this.emitter = new EventEmitter();
  }

  abstract create(t: string): Promise<Base | null>;

  async add(scope: Scp, isNew: boolean) {
    const [t, id] = ObjectPool.parseName(scope.name);

    if (this.objs[id]) {
      return this.objs[id];
    }

    const o = await this.object(t, id);

    if (isNew) {
      this.emitter.emit("created", o);
    }

    return o;
  }

  queueChange(baseC: BaseC) {
    if (this.changeQueue.includes(baseC)) {
      return;
    }

    this.changeQueue.push(baseC);
  }

  queuedChanges() {
    const changes = this.changeQueue;
    this.changeQueue = [];

    return changes;
  }

  obj(id: string) {
    return this.objs[id];
  }

  scpIDObj(id: string) {
    return this.objsByScopeID[id];
  }

  async object(t: string, id: string, ctx?: BaseC) {
    if (this.objs[id]) {
      return this.objs[id];
    }

    const c = this.types[t];
    if (!c) {
      throw new Error(`pool object type not registered: ${t}`);
    }

    const scope = await this.getScope(t, id);
    if (!scope) {
      return null;
    }

    if (this.objs[id]) {
      return this.objs[id];
    }

    const o = new c(this, scope, id);
    if (this.objs[id]) {
      return this.objs[id];
    }

    if (ctx) {
      o.ctx = ctx;
    }

    this.objs[id] = o;
    this.objsByScopeID[scope.id] = o;
    if (!this.objsByType[t]) {
      this.objsByType[t] = [];
    }
    this.objsByType[t].push(o);

    this.emitter.emit("added", o);

    return o;
  }

  async objectFromName(name: string) {
    const [t, id] = ObjectPool.parseName(name);

    return await this.object(t, id);
  }

  objectsOfType(t: string) {
    return this.objsByType[t] || [];
  }

  registerObjectStep(stepID: string, base: Base) {
    return (this.stepObjs[stepID] = base);
  }

  objectForStep(stepID: string) {
    return this.stepObjs[stepID];
  }

  on(event: PoolEvent, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener);
    return () => {
      this.emitter.off(event, listener);
    };
  }

  abstract getScope(t: string, id: string): Promise<Scope | null>;

  static parseName(name: string) {
    const p = name.split(":");
    if (p.length !== 2) {
      throw new Error(`pool: invalid object name: ${name}`);
    }

    return [p[0], p[1]];
  }
}

class AdminPool extends ObjectPool {
  constructor(
    private amng: ScopeManager,
    types: { [key: string]: PoolConstructable }
  ) {
    super(types);
  }

  async getScope(t: string, id: string) {
    const tid = `${t}:${id}`;
    return await this.amng.scope(t, tid);
  }

  async create(t: string) {
    const id = newID();
    return await this.object(t, id);
  }
}

class ParticipantPool extends ObjectPool {
  constructor(types: { [key: string]: PoolConstructable }) {
    super(types);
  }

  async getScope(t: string, id: string) {
    return null;
  }

  async create(t: string): Promise<Base> {
    throw new Error("cannot create scopes");
  }
}
