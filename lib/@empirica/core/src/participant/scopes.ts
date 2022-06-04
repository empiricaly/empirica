import { ScopeChange as TScope, SubAttributesPayload } from "@empirica/tajriba";
import { BehaviorSubject, Observable } from "rxjs";
import { JsonValue } from "../utils/json";
import { Attributes } from "./attributes";
import { ScopeChange } from "./provider";
import { Steps } from "./steps";

export type Constructor<T extends {} = {}> = new (...args: any[]) => T;

export type ScopeConstructor<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> = Constructor<Scope<Context, Kinds>>;

export class Scopes<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> },
  K extends keyof Kinds = ""
> {
  private scopes = new Map<string, Scope<Context, Kinds>>();
  private scopesByKind = new Map<K, Map<string, Scope<Context, Kinds>>>();
  private kindUpdated = new Set<keyof Kinds>();

  constructor(
    scopesObs: Observable<ScopeChange>,
    donesObs: Observable<void>,
    private ctx: Context,
    protected kinds: Kinds,
    private attributes: Attributes,
    private steps: Steps
  ) {
    scopesObs.subscribe({
      next: ({ scope, removed }) => {
        this.update(scope, removed);
      },
    });

    donesObs.subscribe({
      next: () => {
        // this.next();
      },
    });
  }

  scope(id: string) {
    return this.scopes.get(id);
  }

  byKind(kind: K) {
    return this.scopesByKind.get(kind);
  }

  kindWasUpdated(kind: keyof Kinds): boolean {
    return this.kindUpdated.has(kind);
  }

  private update(scope: TScope, removed: boolean) {
    if (removed) {
      const existing = this.scopes.get(scope.id);
      if (!existing) {
        console.warn("classic: missing scope");

        return;
      }

      existing.deleted = true;
      this.scopes.delete(scope.id);

      if (!scope.kind) {
        console.warn("classic: scope missing kind on scope");

        return;
      }

      const kind = scope.kind as K;
      this.scopesByKind.get(kind)?.delete(scope.id);
      this.kindUpdated.add(kind);

      return;
    }

    const existing = this.scopes.get(scope.id);
    if (existing) {
      existing.deleted = false;
      console.warn("classic: replacing scope");
    }

    if (!scope.kind) {
      console.warn("classic: scope missing kind on scope");

      return;
    }

    const kind = scope.kind as K;
    const scopeClass = this.kinds[kind];
    if (!scopeClass) {
      console.warn(`classic: unknown scope kind: ${scope.kind}`);

      return;
    }

    const obj = new scopeClass(this.ctx, scope, this.attributes, this.steps);
    this.scopes.set(scope.id, obj);

    let skm = this.scopesByKind.get(kind);
    if (!skm) {
      skm = new Map();
      this.scopesByKind.set(kind, skm);
    }

    skm.set(scope.id, obj);

    this.kindUpdated.add(kind);
  }
}

export class Scope<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  deleted = false;

  constructor(
    readonly ctx: Context,
    readonly scope: TScope,
    protected scopes: Scopes<Context, Kinds>,
    protected attributes: Attributes,
    protected steps: Steps
  ) {}

  get id() {
    return this.scope.id;
  }

  get kind() {
    return this.scope.kind || "";
  }

  get(key: string): JsonValue {
    return this.attributes.attribute(this.scope.id, key).value;
  }

  sub(key: string): Observable<JsonValue> {
    return this.attributes.attribute(this.scope.id, key).obs;
  }

  set(key: string, value: JsonValue) {
    return this.attributes.attribute(this.scope.id, key).set(value);
  }

  protected ticker(id: string) {
    return this.steps.step(id);
  }

  protected tickerByKey(key: string) {
    const id = this.get(key);
    if (!id || typeof id !== "string") {
      return;
    }

    return this.steps.step(id);
  }

  protected scopeByKey(key: string) {
    const id = this.get(key);
    if (!id || typeof id !== "string") {
      return;
    }

    return this.scopes.scope(id);
  }
}

export class Globals {
  private attrs = new Map<string, BehaviorSubject<JsonValue>>();
  public self?: BehaviorSubject<Globals>;

  constructor(globals: Observable<SubAttributesPayload>) {
    globals.subscribe({
      next: ({ attribute, done }) => {
        if (attribute) {
          let val = null;
          if (attribute.val) {
            val = JSON.parse(attribute.val);
          }

          this.obs(attribute.key).next(val);
        }

        if (done && this.self) {
          this.self.next(this);
        }
      },
    });
  }

  get(key: string) {
    const o = this.attrs.get(key);
    if (o) {
      return o.getValue();
    }

    return null as JsonValue;
  }

  obs(key: string) {
    let o = this.attrs.get(key);
    if (!o) {
      o = new BehaviorSubject<JsonValue>(null);
      this.attrs.set(key, o);
    }

    return o;
  }
}
