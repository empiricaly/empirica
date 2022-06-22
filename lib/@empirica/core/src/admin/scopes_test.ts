import test from "ava";
import { Subject } from "rxjs";
import { Scope } from "../shared/scopes";
import {
  attrChange,
  Context,
  kinds,
  scopeChange,
  setupProvider,
} from "../shared/test_helpers";
import { Attributes } from "./attributes";
import { Scopes } from "./scopes";

function setupScopes() {
  const { provider, changes } = setupProvider();

  const ctx = new Context();

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
    attributes
  );

  provider.dones.subscribe({
    next() {
      scopesDones.next();
      attributesDones.next();
    },
  });

  return { changes, scopes, attributes };
}

test("Scopes should be observable by kind", (t) => {
  const { changes, scopes } = setupScopes();

  const scopeObs = scopes.subscribeKind("game");

  const vals: Scope<Context, typeof kinds>[] = [];
  scopeObs.subscribe({
    next(scope) {
      vals.push(scope);
    },
  });

  t.is(vals.length, 0);

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  t.is(vals.length, 1);
  t.is(vals[0]!.id, "abc");
  t.is(vals[0]!.kind, "game");

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(vals.length, 1);

  // Same scope

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  t.is(vals.length, 1);
});

test("Scopes observable by kind should respect done", (t) => {
  const { changes, scopes } = setupScopes();

  const scopeObs = scopes.subscribeKind("game");

  const vals: Scope<Context, typeof kinds>[] = [];
  scopeObs.subscribe({
    next(scope) {
      vals.push(scope);
    },
  });

  t.is(vals.length, 0);

  // Not done

  changes.next(
    scopeChange({ id: "xyz", kind: "game", done: false, removed: false })
  );

  t.is(vals.length, 0);

  changes.next(
    attrChange({
      key: "b",
      val: "2",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(vals.length, 1);
  t.is(vals[0]!.id, "xyz");
  t.is(vals[0]!.kind, "game");
});

test("Scopes observable by kind should respect kind", (t) => {
  const { changes, scopes } = setupScopes();

  const scopeObs = scopes.subscribeKind("game");

  const vals: Scope<Context, typeof kinds>[] = [];
  scopeObs.subscribe({
    next(scope) {
      vals.push(scope);
    },
  });

  t.is(vals.length, 0);

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  t.is(vals.length, 1);
  t.is(vals[0]!.id, "abc");
  t.is(vals[0]!.kind, "game");

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(vals.length, 1);

  // Different Kind

  changes.next(
    scopeChange({ id: "xyz", kind: "stage", done: true, removed: false })
  );

  t.is(vals.length, 1);
});
