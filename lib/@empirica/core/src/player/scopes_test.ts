import test from "ava";
import { Subject } from "rxjs";
import { Steps } from "../player/steps";
import { Attributes } from "../shared/attributes";
import { Scope, Scopes } from "./scopes";
import {
  attrChange,
  Context,
  scopeChange,
  setupProvider,
  stepChange,
} from "../shared/test_helpers";
import { Constructor } from "../shared/helpers";

export class Stage extends Scope<Context, TestKinds> {}
export class Game extends Scope<Context, TestKinds> {
  get timer() {
    return this.tickerByKey("stepID");
  }

  get badTimer() {
    return this.tickerByKey("notTickerID");
  }
}

type TestKinds = {
  game: Constructor<Game>;
  stage: Constructor<Stage>;
};

export const kinds = {
  game: Game,
  stage: Stage,
};

function setupScopes() {
  const { provider, changes } = setupProvider();

  const ctx = new Context();
  const steps = new Steps(provider.steps, provider.dones);

  const attributesDones = new Subject<void>();
  const scopesDones = new Subject<void>();

  const attributes = new Attributes(
    provider.attributes,
    attributesDones,
    provider.setAttributes
  );

  const scopes = new Scopes(
    provider.scopes,
    scopesDones,
    ctx,
    kinds,
    attributes,
    steps
  );

  provider.dones.subscribe({
    next() {
      scopesDones.next();
      attributesDones.next();
    },
  });

  return { changes, scopes, attributes };
}

test("Scope should get ticker by key", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  changes.next(stepChange({ id: "efg", done: true }));

  changes.next(
    attrChange({
      key: "stepID",
      val: `"efg"`,
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  const scope = scopes.scope("abc") as Game;
  t.truthy(scope);
  t.truthy(scope.timer);
  t.falsy(scope.badTimer);

  changes.next(
    attrChange({
      key: "notTickerID",
      val: "42",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.falsy(scope.badTimer);
});
