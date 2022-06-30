import { Observable } from "rxjs";
import { Attributes } from "../shared/attributes";
import {
  Scope as SharedScope,
  ScopeConstructor,
  ScopeIdent,
  Scopes as SharedScopes,
  ScopeUpdate,
} from "../shared/scopes";
import { Steps } from "./steps";

export class Scopes<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> extends SharedScopes<Context, Kinds, Scope<Context, Kinds>> {
  constructor(
    scopesObs: Observable<ScopeUpdate>,
    donesObs: Observable<void>,
    ctx: Context,
    kinds: Kinds,
    attributes: Attributes,
    private steps: Steps
  ) {
    super(scopesObs, donesObs, ctx, kinds, attributes);
  }

  protected create(
    scopeClass: ScopeConstructor<Context, Kinds>,
    scope: ScopeIdent
  ) {
    return new scopeClass!(
      this.ctx,
      scope,
      this,
      this.attributes,
      this.steps
    ) as Scope<Context, Kinds>;
  }
}

export class Scope<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> extends SharedScope<Context, Kinds> {
  constructor(
    ctx: Context,
    scope: ScopeIdent,
    readonly scopes: Scopes<Context, Kinds>,
    attributes: Attributes,
    private steps: Steps
  ) {
    super(ctx, scope, attributes);
  }

  scopeByKey(key: string) {
    const id = this.get(key);
    if (!id || typeof id !== "string") {
      return;
    }

    return this.scopes.scope(id);
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
}
