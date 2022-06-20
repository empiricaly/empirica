import { Observable, Subject } from "rxjs";
import {
  Scope,
  ScopeConstructor,
  Scopes as SharedScopes,
} from "../shared/scopes";

export class Scopes<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> extends SharedScopes<Context, Kinds> {
  private kindSubs = new Map<keyof Kinds, Subject<Scope<Context, Kinds>>>();

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
}
