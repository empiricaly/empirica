import { Attribute as TAttribute, Scope as TScope } from "@empirica/tajriba";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { JsonValue } from "../json";

export class Scope<T extends ScopeMap<T>> {
  constructor(protected scopes: Scopes<T>, protected scopeID: string) {}

  get(key: string): JsonValue {
    const attr = this.scopes.getAttribute(this.scopeID, key);

    return attr ? attr.val : null;
  }

  sub(key: string): Observable<JsonValue> | null {
    return null;
  }

  set(key: string, value: JsonValue): JsonValue {
    return null;
  }

  protected mapScopes<K extends keyof T, V extends T[K]>(
    type: K,
    key: string
  ): V[] {
    const ids = this.get(key);
    if (!ids || !Array.isArray(ids)) {
      return [];
    }

    return ids.map((id) => this.scopes.find(id as string)) as V[];
  }
}

export class Attribute<T extends ScopeMap<T>> {
  public val: JsonValue;
  constructor(protected scopes: Scopes<T>, public attr: TAttribute) {
    if (attr && attr.val) {
      this.val = JSON.parse(attr.val);
    } else {
      this.val = null;
    }
  }
}

interface ScopeChange {
  scope: TScope;
  removed: boolean;
}

interface AttributeChange {
  attribute: TAttribute;
  removed: boolean;
}

type ScopeMap<T extends ScopeMap<T>> = { [key: string]: Scope<T> };

class Scopes<T extends ScopeMap<T>> {
  private updated: { [key: string]: Subject<void> } = {};

  private scopes: ScopeMap<T> = {};
  private scopeTypes: {
    [key in keyof T]?: BehaviorSubject<Scope<T> | undefined>;
  } = {};
  private scopesSubs: { [key: string]: Subject<void> } = {};

  private attributes: { [key: string]: { [key: string]: Attribute<T> } } = {};
  private attributesSubs: {
    [key: string]: { [key: string]: Subject<void> };
  } = {};

  constructor(
    private types: {
      [key in keyof T]: { new (scopes: Scopes<T>, scopeID: string): Scope<T> };
    },
    scopes: Observable<ScopeChange>,
    attributes: Observable<AttributeChange>,
    dones: Observable<void>
  ) {
    scopes.subscribe({
      next: (scope) => {
        this.updateScopes(scope);
      },
      complete: () => {
        console.warn("no more scopes");
      },
      error: (err) => {
        console.warn("scopes error");
      },
    });

    attributes.subscribe({
      next: (attribute) => {
        this.updateAttributes(attribute);
      },
      complete: () => {
        console.warn("no more attributes");
      },
      error: (err) => {
        console.warn("attributes error");
      },
    });

    dones.subscribe({
      next: () => {
        this.triggerDone(true);
      },
      complete: () => {
        console.warn("no more dones");
      },
      error: (err) => {
        console.warn("dones error");
      },
    });
  }

  getAttribute(scopeID: string, key: string) {
    const scope = this.attributes[scopeID];
    return scope ? scope[key] : null;
  }

  private updateScopes({ scope, removed }: ScopeChange) {
    if (!scope.id) {
      console.warn("scope without name");

      return;
    }

    if (!scope.kind) {
      console.warn("scope without kind");

      return;
    }

    const kind = scope.kind as keyof T;

    if (removed) {
      const val = this.scopes[scope.id];

      delete this.scopes[scope.id];

      if (val && this.scopeTypes[kind]?.getValue() === val) {
        const keys = Object.keys(this.scopes);
        if (keys.length > 0) {
          this.scopeTypes[kind]?.next(this.scopes[keys[0]]);
        } else {
          this.scopeTypes[kind]?.next(undefined);
        }
      }
    } else {
      this.scopes[scope.id] = new this.types[kind](this, scope.id);

      if (!this.scopeTypes[kind]) {
        this.scopeTypes[kind] = new BehaviorSubject<Scope<T> | undefined>(
          this.scopes[scope.id]
        );
      } else {
        if (!this.scopeTypes[kind]?.getValue()) {
          this.scopeTypes[kind]?.next(this.scopes[scope.id]);
        }
      }
    }

    if (!this.scopesSubs[scope.id]) {
      this.scopesSubs[scope.id] = new Subject();
    }

    this.updated[scope.id] = this.scopesSubs[scope.id];
  }

  private updateAttributes({ attribute, removed }: AttributeChange) {
    if (removed) {
      const scope = this.attributes[attribute.node.id];
      if (scope) {
        delete scope[attribute.key];
      }
    } else {
      let scope = this.attributes[attribute.node.id];
      if (!scope) {
        scope = {};
        this.attributes[attribute.node.id] = scope;
      }
      scope[attribute.key] = new Attribute(this, attribute);
    }

    let scope = this.attributesSubs[attribute.node.id];
    if (!scope) {
      scope = {};
      this.attributesSubs[attribute.node.id] = scope;
    }

    let attr = scope[attribute.key];
    if (!attr) {
      attr = new Subject();
      scope[attribute.key] = attr;
    }

    this.updated[attribute.node.id + "-" + attribute.id] = attr;
  }

  private triggerDone(done: boolean) {
    if (done) {
      for (const sub in this.updated) {
        this.updated[sub].next();
      }
      this.updated = {};
    }
  }

  first<A extends keyof T, B extends T[A]>(kind: A): B | undefined {
    return <B | undefined>this.scopeTypes[kind]?.getValue();
  }

  all<A extends keyof T, B extends T[A]>(kind: A): B[] {
    return [];
  }

  find(id: string): Scope<T> | undefined {
    return this.scopes[id];
  }

  subFirst<A extends keyof T, B extends T[A]>(
    kind: A
  ): Observable<B | undefined> {
    let obs = this.scopeTypes[kind];
    if (!obs) {
      obs = new BehaviorSubject<Scope<T> | undefined>(undefined);
      this.scopeTypes[kind] = obs;
    }

    return <Observable<B | undefined>>obs;
  }
}

class TajribaProvider {
  constructor(
    public scopes: Observable<ScopeChange>,
    public attributes: Observable<AttributeChange>,
    public dones: Observable<void>
  ) {}
}

// =============================================================================
//
//

export class Game extends Scope<Types> {
  get players() {
    return this.mapScopes("player", "playerIDs");
  }

  get rounds() {
    return this.mapScopes("round", "roundIDs");
  }
}

export class Player extends Scope<Types> {
  get id(): string {
    return <string>this.get("id");
  }

  get game() {
    return this.scopes.subFirst("game");
  }
}

export class Round extends Scope<Types> {}
export class Stage extends Scope<Types> {}

type Types = {
  game: Game;
  player: Player;
  round: Round;
  stage: Stage;
};

const types = {
  game: Game,
  player: Player,
  round: Round,
  stage: Stage,
};

class Root {
  scopes: Scopes<Types>;
  constructor(
    private playerID: string,
    { scopes, attributes, dones }: TajribaProvider
  ) {
    this.scopes = new Scopes<Types>(types, scopes, attributes, dones);
  }

  game() {
    return this.scopes.first("game");
  }

  round() {
    return this.scopes.first("round");
  }

  stage() {
    return this.scopes.first("stage");
  }

  player() {
    return this.scopes.find(this.playerID) as Player | undefined;
  }

  players() {
    return this.scopes.all("player");
  }
}
