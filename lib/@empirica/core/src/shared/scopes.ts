import { BehaviorSubject, Observable } from "rxjs";
import { Attribute, AttributeOptions, Attributes } from "../shared/attributes";
import { Constructor } from "../shared/helpers";
import { warn } from "../utils/console";
import { JsonValue } from "../utils/json";

export type Attributable = {
  get: (key: string) => JsonValue | undefined;
  set: (key: string, value: JsonValue, ao?: Partial<AttributeOptions>) => void;
};

export interface ScopeIdent {
  id: string;
  kind: string;
}

export interface ScopeUpdate {
  scope: ScopeIdent;
  removed: boolean;
}

export type ScopeConstructor<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> = Constructor<Scope<Context, Kinds>>;

export class Scopes<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> },
  Skope extends Scope<Context, Kinds> = Scope<Context, Kinds>
> {
  protected scopes = new Map<string, BehaviorSubject<Skope>>();
  protected scopesByKind = new Map<keyof Kinds, Map<string, Skope>>();
  protected kindUpdated = new Set<keyof Kinds>();

  constructor(
    scopesObs: Observable<ScopeUpdate>,
    donesObs: Observable<void>,
    protected ctx: Context,
    protected kinds: Kinds,
    protected attributes: Attributes
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

  scope(id: string): Skope | undefined {
    return this.scopes.get(id)?.getValue();
  }

  scopeObs(id: string): Observable<Skope> | undefined {
    return this.scopes.get(id);
  }

  byKind<T extends Skope>(kind: keyof Kinds) {
    let map = this.scopesByKind.get(kind);
    if (!map) {
      map = new Map();
      this.scopesByKind.set(kind, map);
    }

    return map! as Map<string, T>;
  }

  kindWasUpdated(kind: keyof Kinds): boolean {
    return this.kindUpdated.has(kind);
  }

  protected next() {
    this.kindUpdated.clear();
    for (const [_, scopeSubject] of this.scopes) {
      const scope = scopeSubject.getValue();
      if (scope._updated || this.attributes.scopeWasUpdated(scope.id)) {
        scope._updated = false;
        scopeSubject.next(scope);
      }
    }
  }

  protected update(scope: ScopeIdent, removed: boolean) {
    const existing = this.scopes.get(scope.id)?.getValue();

    if (removed) {
      if (!existing) {
        warn("scopes: missing scope on removal", scope.id, scope.kind);

        return;
      }

      existing._deleted = true;
      existing._updated = true;
      this.scopes.delete(scope.id);

      if (!scope.kind) {
        warn("scopes: scope missing kind on scope on removal");

        return;
      }

      const kind = scope.kind as keyof Kinds;

      // Using ! because scopes by kind must exist, since this scope was found.
      this.scopesByKind.get(kind)!.delete(scope.id);

      this.kindUpdated.add(kind);

      return;
    }

    if (existing) {
      existing._deleted = false;
      return;
    }

    if (!scope.kind) {
      warn("scopes: scope missing kind on scope");

      return;
    }

    const kind = scope.kind as keyof Kinds;
    const scopeClass = this.kinds[kind];
    if (!scopeClass) {
      warn(`scopes: unknown scope kind: ${scope.kind}`);

      return;
    }

    const obj = this.create(scopeClass, scope);
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

  protected create(
    scopeClass: ScopeConstructor<Context, Kinds>,
    scope: ScopeIdent
  ) {
    return new scopeClass!(this.ctx, scope, this.attributes) as Skope;
  }
}

export class Scope<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  /**
   * @internal
   */
  _deleted = false;

  /**
   * @internal
   */
  _updated = false;

  constructor(
    /**
     * @internal
     */
    readonly ctx: Context,
    /**
     * @internal
     */
    readonly scope: ScopeIdent,
    /**
     * @internal
     */
    protected attributes: Attributes
  ) {}

  get id() {
    return this.scope.id;
  }

  /**
   * @internal
   */
  get kind() {
    // Using ! because we don't allow scopes without kind
    return this.scope.kind!;
  }

  get(key: string): JsonValue | undefined {
    return this.attributes.attribute(this.scope.id, key).value;
  }

  getAttribute(key: string): Attribute | undefined {
    return this.attributes.attribute(this.scope.id, key);
  }

  obs(key: string): Observable<JsonValue | undefined> {
    return this.attributes.attribute(this.scope.id, key).obs;
  }

  set(key: string, value: JsonValue, ao?: Partial<AttributeOptions>) {
    return this.attributes.attribute(this.scope.id, key).set(value, ao);
  }

  inspect() {
    const attrs = this.attributes.attributes(this.scope.id);

    const out: { [key: string]: JsonValue | undefined } = {};
    for (const attr of attrs) {
      out[attr.key] = attr.value;
    }

    return out;
  }

  /**
   * @internal
   */
  hasUpdated() {
    return this._updated || this.attributes.scopeWasUpdated(this.id);
  }
}
