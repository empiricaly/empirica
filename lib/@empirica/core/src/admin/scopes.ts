import {
  AddGroupInput,
  AddScopeInput,
  AddStepInput,
  LinkInput,
  TransitionInput,
} from "@empirica/tajriba";
import { Observable, Subject } from "rxjs";
import {
  Scope as SharedScope,
  ScopeConstructor,
  ScopeIdent,
  Scopes as SharedScopes,
  ScopeUpdate,
} from "../shared/scopes";
import { Attributes } from "./attributes";
import { Finalizer, TajribaAdminAccess } from "./context";

export class Scopes<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> extends SharedScopes<Context, Kinds, Scope<Context, Kinds>> {
  private kindSubs = new Map<keyof Kinds, Subject<Scope<Context, Kinds>>>();

  constructor(
    scopesObs: Observable<ScopeUpdate>,
    donesObs: Observable<void>,
    ctx: Context,
    kinds: Kinds,
    attributes: Attributes,
    readonly taj: TajribaAdminAccess
  ) {
    super(scopesObs, donesObs, ctx, kinds, attributes);
  }

  subscribeKind(kind: keyof Kinds): Observable<Scope<Context, Kinds>> {
    if (!this.kindSubs.has(kind)) {
      this.kindSubs.set(kind, new Subject());
    }

    return this.kindSubs.get(kind)!;
  }

  protected next() {
    for (const [_, scopeSubject] of this.scopes) {
      const scope = scopeSubject.getValue();
      if (scope._updated) {
        const kindSub = this.kindSubs.get(scope.kind);
        if (kindSub) {
          kindSub.next(scope);
        }
      }
    }

    super.next();
  }

  protected create(
    scopeClass: ScopeConstructor<Context, Kinds>,
    scope: ScopeIdent
  ) {
    return new scopeClass!(this.ctx, scope, this, this.attributes) as Scope<
      Context,
      Kinds
    >;
  }
}

export class Scope<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> extends SharedScope<Context, Kinds> {
  /**
   * @internal
   */
  readonly taj: TajribaAdminAccess;

  constructor(
    ctx: Context,
    scope: ScopeIdent,
    private scopes: Scopes<Context, Kinds>,
    attributes: Attributes
  ) {
    super(ctx, scope, attributes);
    this.taj = scopes.taj;
  }

  protected scopeByKey<T extends Scope<Context, Kinds>>(
    key: string
  ): T | undefined {
    const id = this.get(key);
    if (!id || typeof id !== "string") {
      return;
    }

    return this.scopes.scope(id) as T | undefined;
  }

  protected scopesByKind(kind: keyof Kinds) {
    return this.scopes.byKind(kind);
  }

  protected scopesByKindMatching<T extends Scope<Context, Kinds>>(
    kind: keyof Kinds,
    key: string,
    val: string
  ): T[] {
    const scopes = Array.from(this.scopes.byKind(kind).values());
    return scopes.filter((s) => s.get(key) === val) as T[];
  }

  protected addScopes(input: AddScopeInput[]) {
    return this.taj.addScopes(input);
  }

  protected addGroups(input: AddGroupInput[]) {
    return this.taj.addGroups(input);
  }

  protected addLinks(input: LinkInput[]) {
    return this.taj.addLinks(input);
  }

  protected addSteps(input: AddStepInput[]) {
    return this.taj.addSteps(input);
  }

  protected addTransitions(input: TransitionInput[]) {
    return this.taj.addTransitions(input);
  }

  protected addFinalizer(cb: Finalizer) {
    this.taj.addFinalizer(cb);
  }

  /**
   * @internal
   */
  get globals() {
    return this.taj.globals;
  }
}
