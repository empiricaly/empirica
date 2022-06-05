import { ScopeChange as TScope } from "@empirica/tajriba";
import { BehaviorSubject, Observable } from "rxjs";
import { warn } from "../utils/console";
import { JsonValue } from "../utils/json";
import { AttributeOptions, Attributes } from "./attributes";
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
  private scopes = new Map<string, BehaviorSubject<Scope<Context, Kinds>>>();
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
      next: this.next.bind(this),
    });
  }

  scope(id: string): Scope<Context, Kinds> | undefined {
    return this.scopes.get(id)?.getValue();
  }

  scopeObs(id: string): Observable<Scope<Context, Kinds>> | undefined {
    return this.scopes.get(id);
  }

  byKind(kind: K) {
    let map = this.scopesByKind.get(kind);
    if (!map) {
      map = new Map();
      this.scopesByKind.set(kind, map);
    }

    return map;
  }

  kindWasUpdated(kind: keyof Kinds): boolean {
    return this.kindUpdated.has(kind);
  }

  private next() {
    this.kindUpdated.clear();
    for (const [_, scopeSubject] of this.scopes) {
      const scope = scopeSubject.getValue();
      if (scope._updated || this.attributes.scopeWasUpdated(scope.id)) {
        scope._updated = false;
        scopeSubject.next(scope);
      }
    }
  }

  private update(scope: TScope, removed: boolean) {
    const existing = this.scopes.get(scope.id)?.getValue();

    if (removed) {
      if (!existing) {
        warn("classic: missing scope on removal");

        return;
      }

      existing._deleted = true;
      existing._updated = true;
      this.scopes.delete(scope.id);

      if (!scope.kind) {
        warn("classic: scope missing kind on scope on removal");

        return;
      }

      const kind = scope.kind as K;
      this.scopesByKind.get(kind)?.delete(scope.id);
      this.kindUpdated.add(kind);

      return;
    }

    if (existing) {
      existing._deleted = false;
      warn("classic: replacing scope");
    }

    if (!scope.kind) {
      warn("classic: scope missing kind on scope");

      return;
    }

    const kind = scope.kind as K;
    const scopeClass = this.kinds[kind];
    if (!scopeClass) {
      warn(`classic: unknown scope kind: ${scope.kind}`);

      return;
    }

    const obj = new scopeClass(
      this.ctx,
      scope,
      this,
      this.attributes,
      this.steps
    );
    const subj = new BehaviorSubject(obj);
    this.scopes.set(scope.id, subj);

    let skm = this.scopesByKind.get(kind);
    if (!skm) {
      skm = new Map();
      this.scopesByKind.set(kind, skm);
    }

    skm.set(scope.id, obj);

    obj._updated = true;
    this.kindUpdated.add(kind);
  }
}

export class Scope<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  _deleted = false;
  _updated = false;

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

  get(key: string): JsonValue | undefined {
    return this.attributes.attribute(this.scope.id, key).value;
  }

  obs(key: string): Observable<JsonValue | undefined> {
    return this.attributes.attribute(this.scope.id, key).obs;
  }

  set(key: string, value: JsonValue, ao?: Partial<AttributeOptions>) {
    return this.attributes.attribute(this.scope.id, key).set(value, ao);
  }

  protected ticker(id: string) {
    return this.steps.step(id);
  }

  protected tickerByKey(key: string) {
    const id = this.get(key);
    if (!id || typeof id !== "string") {
      return;
    }

    return this.ticker(id);
  }

  protected scopeByKey(key: string) {
    const id = this.get(key);
    if (!id || typeof id !== "string") {
      return;
    }

    return this.scopes.scope(id);
  }
}
