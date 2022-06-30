import {
  AddGroupInput,
  AddScopeInput,
  AddStepInput,
  LinkInput,
  SubAttributesPayload,
  TransitionInput,
} from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import { Constructor } from "../shared/helpers";
import {
  attrChange,
  Context,
  scopeChange,
  setupProvider,
} from "../shared/test_helpers";
import { Attributes } from "./attributes";
import { Finalizer, TajribaAdminAccess } from "./context";
import { Globals } from "./globals";
import { Scope, Scopes } from "./scopes";

export class AdminBatch extends Scope<Context, AdminKinds> {}
export class AdminGame extends Scope<Context, AdminKinds> {
  get batch() {
    return this.scopeByKey("batchID") as AdminBatch | undefined;
  }

  get badBatch() {
    return this.scopeByKey("noStageID") as AdminBatch | undefined;
  }

  addBatch() {
    this.addScopes([{ kind: "batch" }]);
  }
}
export type AdminKinds = {
  batch: Constructor<AdminBatch>;
  game: Constructor<AdminGame>;
};

export const adminKinds = {
  batch: AdminBatch,
  game: AdminGame,
};

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

  const called: {
    finalizers: Finalizer[];
    addScopes: AddScopeInput[][];
    addGroups: AddGroupInput[][];
    addLinks: LinkInput[][];
    addSteps: AddStepInput[][];
    addTransitions: TransitionInput[][];
  } = {
    finalizers: [],
    addScopes: [],
    addGroups: [],
    addLinks: [],
    addSteps: [],
    addTransitions: [],
  };

  // c8 ignores in scope addX callbacks because they are tested elsewhere

  const globals = new Subject<SubAttributesPayload>();

  const mut = new TajribaAdminAccess(
    (cb: Finalizer) => {
      /* c8 ignore next 2 */
      called.finalizers.push(cb);
    },
    async (inputs: AddScopeInput[]) => {
      called.addScopes.push(inputs);
      return [];
    },
    async (inputs: AddGroupInput[]) => {
      /* c8 ignore next 2 */
      called.addGroups.push(inputs);
      return [];
    },
    async (inputs: LinkInput[]) => {
      /* c8 ignore next 2 */
      called.addLinks.push(inputs);
      return [];
    },
    async (inputs: AddStepInput[]) => {
      /* c8 ignore next 3 */
      called.addSteps.push(inputs);

      return [{ id: "123", duration: inputs[0]!.duration }];
    },
    async (inputs: TransitionInput[]) => {
      /* c8 ignore next 3 */
      called.addTransitions.push(inputs);
      return [];
    },
    new Globals(globals, "globals", provider.setAttributes)
  );

  const scopes = new Scopes(
    provider.scopes,
    scopesDones,
    ctx,
    adminKinds,
    attributes,
    mut
  );

  provider.dones.subscribe({
    next() {
      scopesDones.next();
      attributesDones.next();
    },
  });

  return { changes, scopes, attributes, called };
}

test("Scopes should be observable by kind", (t) => {
  const { changes, scopes } = setupScopes();

  const scopeObs = scopes.subscribeKind("game");

  const vals: Scope<Context, AdminKinds>[] = [];
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

  const vals: Scope<Context, AdminKinds>[] = [];
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

  const vals: Scope<Context, AdminKinds>[] = [];
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
    scopeChange({ id: "xyz", kind: "batch", done: true, removed: false })
  );

  t.is(vals.length, 1);
});

test("Scope should get other scope by key", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  changes.next(
    scopeChange({ id: "efg", kind: "batch", done: true, removed: false })
  );

  changes.next(
    attrChange({
      key: "batchID",
      val: `"efg"`,
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  changes.next(
    attrChange({
      key: "noBatchID",
      val: `"efg"`,
      nodeID: "0",
      done: true,
      removed: false,
    })
  );

  const scope = scopes.scope("abc") as AdminGame;
  t.truthy(scope);
  t.truthy(scope.batch);
  t.truthy(scope.batch instanceof AdminBatch);
  t.falsy(scope.badBatch instanceof AdminBatch);
});

test("Scope should add other scope", (t) => {
  const { changes, scopes, called } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scope = scopes.scope("abc") as AdminGame;
  scope.addBatch();

  t.deepEqual(called.addScopes, [[{ kind: "batch" }]]);
});

test("Scope should have access to globals", (t) => {
  const { changes, scopes } = setupScopes();

  changes.next(
    scopeChange({ id: "abc", kind: "game", done: true, removed: false })
  );

  const scope = scopes.scope("abc") as AdminGame;
  scope.addBatch();

  t.true(scope.globals instanceof Globals);
});
