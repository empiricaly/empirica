import { ScopeChange as TScope } from "@empirica/tajriba";
import { BehaviorSubject, Observable } from "rxjs";
import { Attributes } from "../shared/attributes";
import {
  Scope as SharedScope,
  ScopeConstructor,
  ScopeIdent,
  Scopes as SharedScopes,
  ScopeUpdate,
} from "../shared/scopes";
import { warn } from "../utils/console";
import { Steps } from "./steps";

export class Scopes<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> extends SharedScopes<Context, Kinds> {
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
    return new scopeClass!(this.ctx, scope, this, this.attributes, this.steps);
  }
}

export class Scope<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> extends SharedScope<Context, Kinds> {
  _deleted = false;
  _updated = false;

  constructor(
    ctx: Context,
    scope: TScope,
    scopes: Scopes<Context, Kinds>,
    attributes: Attributes,
    private steps: Steps
  ) {
    super(ctx, scope, scopes, attributes);
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

  hasUpdated() {
    return this._updated || this.attributes.scopeWasUpdated(this.id);
  }
}
