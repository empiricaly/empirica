import test from "ava";
import { Subject } from "rxjs";
import {
  attrChange,
  Context,
  Game,
  kinds,
  partChange,
  scopeChange,
  setupProvider,
  Stage,
  stepChange,
  textHasLog,
} from "../shared/test_helpers";
import { captureLogs } from "../utils/console";
import { JsonValue } from "../utils/json";
import { Attributes } from "./attributes";
import { Scopes } from "./scopes";
import { Steps } from "./steps";

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

test("Scopes should track scopes and attributes", (t) => {
  const { changes, scopes } = setupScopes();

  t.log("Attribute update but no scope yet");

  changes.next(
    attrChange({
      key: "a",
      val: "0",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  const noScope = scopes.scope("abc")!;
  t.falsy(noScope);

  t.log("Add scope, find scope");

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scope = scopes.scope("abc")!;
  t.truthy(scope);

  t.log("Attribute update, but not done yet");

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.is(scope.get("a"), 0);

  t.log("Attribute update and done");

  changes.next(
    attrChange({
      key: "a",
      val: "2",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );
  t.is(scope.get("a"), 2);

  t.log("Attribute update, not done");

  changes.next(
    attrChange({
      key: "b",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.is(scope.get("b"), undefined);

  t.log("Done elsewhere");

  changes.next(stepChange({ done: true, removed: false }));

  t.is(scope.get("b"), 1);
});

test("Scopes should delete scopes", (t) => {
  const { changes, scopes } = setupScopes();

  t.log("Add scope and attribute");

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scope = scopes.scope("abc")!;
  t.truthy(scope);

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );
  t.is(scope.get("a"), 1);

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: true })
  );

  t.log("Can still get from previously captured scope");

  t.is(scope.get("a"), 1);

  t.log("Scope marked as deleted");

  t.true(scope._deleted);

  t.log("Cannot find scope again");

  const scopeAgain = scopes.scope("abc")!;
  t.falsy(scopeAgain);
});

test("Scopes should use kind to init Scope", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scope = scopes.scope("abc")!;
  t.truthy(scope);
  t.truthy(scope instanceof Game);
});

test("Scopes should be observable", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scopeObs = scopes.scopeObs("abc")!;
  t.truthy(scopeObs);

  let count = 0;
  scopeObs.subscribe({
    next() {
      count++;
    },
  });

  t.is(count, 1);

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(count, 2);

  changes.next(
    attrChange({
      key: "b",
      val: "2",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(count, 3);
});

test("Scopes should know if kind was updated", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: false, removed: false })
  );

  t.true(scopes.kindWasUpdated("game"));
  t.false(scopes.kindWasUpdated("stage"));

  changes.next(partChange({ done: true }));

  t.false(scopes.kindWasUpdated("game"));
  t.false(scopes.kindWasUpdated("stage"));
});

test("Scopes should be queryingable by kind", (t) => {
  const { changes, scopes } = setupScopes();

  t.log("Has games");

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scope = scopes.scope("abc")!;
  t.truthy(scope);

  const games = scopes.byKind("game")!;
  t.truthy(games.size === 1);
  t.truthy(games.get("abc") === scope);

  t.log("Does not have stages");

  const stages = scopes.byKind("stage")!;
  t.truthy(stages.size === 0);

  t.log("Removes game");

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: true })
  );

  const gamesAgain = scopes.byKind("game")!;
  t.truthy(gamesAgain.size === 0);
});

test("Scopes works on removal of missing scope", (t) => {
  const { changes, scopes } = setupScopes();

  const logs = captureLogs(function () {
    changes.next(
      scopeChange({ id: "abc", kind: "game", done: true, removed: true })
    );

    const games = scopes.byKind("game")!;
    t.truthy(games.size === 0);
  });

  textHasLog(t, logs, "warn", "missing scope on removal");
});

test("Scopes works on removal of missing kind", (t) => {
  const { changes, scopes } = setupScopes();

  const logs = captureLogs(function () {
    changes.next(
      scopeChange({ id: "abc", kind: "game", done: true, removed: false })
    );

    changes.next(
      scopeChange({ id: "abc", kind: null, done: true, removed: true })
    );

    const games = scopes.byKind("game")!;
    t.truthy(games.size === 1);
  });

  textHasLog(t, logs, "warn", "scope missing kind on scope on removal");
});

test("Scopes works on removal with missing kind", (t) => {
  const { changes, scopes } = setupScopes();

  const logs = captureLogs(function () {
    changes.next(
      scopeChange({ id: "abc", kind: null, done: true, removed: true })
    );

    // "as game" to satisfy TS
    const games = scopes.byKind("" as "game")!;
    t.truthy(games.size === 0);
  });

  textHasLog(t, logs, "warn", "missing scope on removal");
});

test("Scopes ignore unknown kinds", (t) => {
  const { changes, scopes } = setupScopes();

  const logs = captureLogs(function () {
    changes.next(
      scopeChange({ id: "abc", kind: "unknown", done: true, removed: false })
    );

    // "as game" to satisfy TS
    const unknowns = scopes.byKind("unknown" as "game")!;
    t.truthy(unknowns.size === 0);
  });

  textHasLog(t, logs, "warn", "unknown scope kind: unknown");
});

test("Scopes ignore missing kinds", (t) => {
  const { changes, scopes } = setupScopes();

  const logs = captureLogs(function () {
    changes.next(
      scopeChange({ id: "abc", kind: null, done: true, removed: false })
    );

    // "as game" to satisfy TS
    const unknowns = scopes.byKind("" as "game")!;
    t.truthy(unknowns.size === 0);
  });

  textHasLog(t, logs, "warn", "scope missing kind on scope");
});

test("Scopes supports replacing of scope", (t) => {
  const { changes, scopes } = setupScopes();

  const logs = captureLogs(function () {
    changes.next(
      scopeChange({ id: "abc", kind: "game", done: true, removed: false })
    );

    const scope = scopes.scope("abc")!;
    t.truthy(scope);

    changes.next(
      scopeChange({ id: "abc", kind: "game", done: true, removed: false })
    );

    const scopeAgain = scopes.scope("abc")!;
    t.truthy(scopeAgain);
  });

  textHasLog(t, logs, "warn", "replacing scope");
});

test("Scope should know if it was updated", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: false, removed: false })
  );

  const scope = scopes.scope("abc")!;
  t.true(scope._updated);

  changes.next(partChange({ done: true }));

  const scopeAgain = scopes.scope("abc")!;
  t.false(scopeAgain._updated);
  t.false(scope._updated);
});

test("Scope fields are correct", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scope = scopes.scope("abc")!;
  t.is(scope.id, "abc");
  t.is(scope.kind, "game");
});

test("Scope can set key", (t) => {
  const { changes, scopes, attributes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scope = scopes.scope("abc")!;
  t.true(scope.get("a") === undefined);

  changes.next(
    attrChange({
      key: "a",
      val: "0",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(scope.get("a"), 0);
  scope.set("a", 42);

  t.is(scope.get("a"), 42);

  t.is(attributes.attribute("abc", "a").value, 42);

  scope.set("a", 42, { protected: true });
});

test("Scope sub works", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scope = scopes.scope("abc")!;
  t.truthy(scope);

  const vals: (JsonValue | undefined)[] = [];
  scope.obs("a").subscribe({
    next(val) {
      vals.push(val);
    },
  });

  t.deepEqual(vals, [undefined]);

  changes.next(
    attrChange({
      key: "a",
      val: "0",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );

  t.deepEqual(vals, [undefined]);

  changes.next(partChange({ done: true }));

  t.deepEqual(vals, [undefined, 0]);

  changes.next(
    attrChange({
      key: "a",
      val: `"pancake"`,
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.deepEqual(vals, [undefined, 0, "pancake"]);
});

test("Scope should get other scope by key", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  changes.next(
    scopeChange({ id: "efg", kind: "stage", done: true, removed: false })
  );

  changes.next(
    attrChange({
      key: "stageID",
      val: `"efg"`,
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  changes.next(
    attrChange({
      key: "noStageID",
      val: `"efg"`,
      nodeID: "0",
      done: true,
      removed: false,
    })
  );

  const scope = scopes.scope("abc") as Game;
  t.truthy(scope);
  t.truthy(scope.stage);
  t.truthy(scope.stage instanceof Stage);
  t.falsy(scope.badStage);
});

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
