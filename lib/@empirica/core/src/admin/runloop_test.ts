import { AddScopeInput, State } from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import { restore } from "sinon";
import { Constructor } from "../player";
import {
  Context,
  nextTick,
  setupTokenProvider,
  textHasLog,
} from "../shared/test_helpers";
import { captureLogs, captureLogsAsync } from "../utils/console";
import { AdminConnection } from "./connection";
import { ListenersCollector, Subscriber } from "./events";
import { Runloop } from "./runloop";
import { Scope } from "./scopes";

export class AdminGlobals extends Scope<Context, AdminKinds> {}
export class AdminBatch extends Scope<Context, AdminKinds> {}
export class AdminGame extends Scope<Context, AdminKinds> {
  addBatch(props: AddScopeInput[]) {
    this.addScopes(props);
  }
}
export type AdminKinds = {
  globals: Constructor<AdminGlobals>;
  batch: Constructor<AdminBatch>;
  game: Constructor<AdminGame>;
};

export const adminKinds = {
  globals: AdminGlobals,
  batch: AdminBatch,
  game: AdminGame,
};

test.serial.afterEach(() => {
  restore();
});

const attribProps = {
  id: "987",
  nodeID: "poi",
  nodeKind: "game",
  invalidScope: false,
  key: "a",
  val: "42",
};

function attrib(props: Partial<typeof attribProps> = attribProps) {
  const { id, nodeID, nodeKind, key, val, invalidScope } = {
    ...attribProps,
    ...props,
  };

  return {
    __typename: "Attribute",
    id,
    node: {
      __typename: invalidScope ? "" : "Scope",
      id: nodeID,
      kind: nodeKind,
    },
    vector: false,
    version: 1,
    key,
    val,
    createdAt: 0,
    createdBy: {
      id: "deckard",
      __typename: "Service",
      createdAt: 0,
      name: "wt",
    },
    current: true,
    immutable: false,
    private: false,
    protected: false,
    ephemeral: false,
  };
}

async function setupRunloop(
  {
    failAddScope = false,
  }: {
    failAddScope: boolean;
  } = { failAddScope: false }
) {
  const {
    cbs,
    taj,
    strg,
    resetToken,
    scopedAttributesSub,
    onEventSub,
    called: tajCalled,
  } = setupTokenProvider({ failAddScope });

  cbs["connected"]![0]!();

  const ctx = new Context();
  const admin = new AdminConnection(taj, strg.tokens, resetToken);
  const adminSubs = new Subject<Subscriber<Context, AdminKinds>>();
  const adminStop = new Subject<void>();

  // Wait for session establishement
  await nextTick();

  new Runloop(admin, ctx, adminKinds, "globals", adminSubs, adminStop);

  let called = {
    subscriber: 0,
    startCalled: 0,
    kindCalled: 0,
    tajCalled,
  };

  adminSubs.next((subs: ListenersCollector<Context, AdminKinds>) => {
    called.subscriber++;
    subs.on("start", (ctx) => {
      called.startCalled++;
      ctx.scopeSub({ kinds: ["game"] });
    });
    subs.on("game", (ctx, { game }) => {
      called.kindCalled++;
      ctx.scopeSub({ kinds: ["batch"] });
      ctx.scopeSub({ ids: ["poi"] });
      ctx.scopeSub({ names: ["poi"] });
      ctx.scopeSub({ keys: ["poi"] });
      ctx.scopeSub({ kvs: [{ key: "poi", val: "iop" }] });
      game.addBatch([{ kind: "batch" }]);
      game.addGroups([{ participantIDs: ["123"] }]);
      game.addLinks([
        { link: true, nodeIDs: ["abc"], participantIDs: ["123"] },
      ]);
      game.addSteps([{ duration: 123 }]);
      game.addTransitions([
        {
          from: State.Created,
          nodeID: "abc",
          to: State.Running,
        },
      ]);
      game.set("a", 42);
    });
    subs.on("batch", (ctx) => {
      called.kindCalled++;
      ctx.participantsSub();
      ctx.transitionsSub("tre");
    });
  });

  return { scopedAttributesSub, onEventSub, called, adminSubs, adminStop };
}

test.serial("Runloop triggers kinds", async (t) => {
  const { scopedAttributesSub, called } = await setupRunloop();

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(called.kindCalled, 0);

  await nextTick();

  t.log("kind listener triggered");

  scopedAttributesSub.next({
    attribute: attrib(),
    done: true,
  });

  await nextTick();
  await nextTick();

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(called.kindCalled, 1);

  t.log("same scope listener not triggered");

  scopedAttributesSub.next({
    attribute: attrib(),
    done: true,
  });

  await nextTick();

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(called.kindCalled, 1);

  t.log("other kind listener triggered after second sub");

  scopedAttributesSub.next({
    attribute: attrib({ nodeID: "765", nodeKind: "batch" }),
    done: true,
  });

  await nextTick();
  await nextTick();

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(called.kindCalled, 2);
});

test.serial("Runloop ignores bad scope", async (t) => {
  const { scopedAttributesSub, called } = await setupRunloop();

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(called.kindCalled, 0);

  await nextTick();

  t.log("kind listener triggered");

  const logs = captureLogs(function () {
    scopedAttributesSub.next({
      attribute: attrib({ invalidScope: true }),
      done: true,
    });
  });

  textHasLog(t, logs, "error", "non-scope node");

  await nextTick();

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(called.kindCalled, 0);
});

test.serial("Runloop triggers taj event", async (t) => {
  const { onEventSub, scopedAttributesSub, called } = await setupRunloop();

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(called.kindCalled, 0);

  await nextTick();

  scopedAttributesSub.next({
    done: true,
  });

  await nextTick();

  t.log("kind listener triggered");

  scopedAttributesSub.next({
    done: true,
  });

  onEventSub.next({
    done: true,
  });

  await nextTick();
});

test.serial("Runloop adds new layer", async (t) => {
  const { adminSubs, scopedAttributesSub, called } = await setupRunloop();

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(called.kindCalled, 0);

  await nextTick();

  scopedAttributesSub.next({
    done: true,
  });

  adminSubs.next((subs: ListenersCollector<Context, AdminKinds>) => {
    called.subscriber++;
    subs.on("start", (ctx) => {
      called.startCalled++;
      ctx.scopeSub({ kinds: ["game"] });
    });
  });

  await nextTick(100);

  t.is(called.subscriber, 2);
  t.is(called.startCalled, 2);
});

test.serial("Runloop stops", async (t) => {
  const { adminSubs, adminStop, scopedAttributesSub, called } =
    await setupRunloop();

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(called.kindCalled, 0);

  await nextTick();

  scopedAttributesSub.next({
    done: true,
  });

  adminStop.next();

  let calls = 0;
  adminSubs.next((_: ListenersCollector<Context, AdminKinds>) => {
    /* c8 ignore next */
    calls++;
  });

  t.is(called.subscriber, 1);
  t.is(called.startCalled, 1);
  t.is(calls, 0);
});

test.serial("Runloop creates scopes", async (t) => {
  const { scopedAttributesSub, called } = await setupRunloop();

  await nextTick();

  scopedAttributesSub.next({
    attribute: attrib(),
    done: true,
  });

  await nextTick(10);

  t.deepEqual(called.tajCalled.addScopes, [
    [
      {
        kind: "batch",
      },
    ],
  ]);
});

test.serial("Runloop creates attributes", async (t) => {
  const { scopedAttributesSub, called } = await setupRunloop();

  await nextTick();

  scopedAttributesSub.next({
    attribute: attrib(),
    done: true,
  });

  await nextTick(10);

  t.deepEqual(called.tajCalled.setAttributes, [
    [
      {
        key: "a",
        nodeID: "poi",
        val: "42",
      },
    ],
  ]);
});

test.serial("Runloop creates groups", async (t) => {
  const { scopedAttributesSub, called } = await setupRunloop();

  await nextTick();

  scopedAttributesSub.next({
    attribute: attrib(),
    done: true,
  });

  await nextTick(10);

  t.deepEqual(called.tajCalled.addGroups, [
    [
      {
        participantIDs: ["123"],
      },
    ],
  ]);
});

test.serial("Runloop creates links", async (t) => {
  const { scopedAttributesSub, called } = await setupRunloop();

  await nextTick();

  scopedAttributesSub.next({
    attribute: attrib(),
    done: true,
  });

  await nextTick(10);

  t.deepEqual(called.tajCalled.addLink, [
    { link: true, nodeIDs: ["abc"], participantIDs: ["123"] },
  ]);
});

test.serial("Runloop creates steps", async (t) => {
  const { scopedAttributesSub, called } = await setupRunloop();

  await nextTick();

  scopedAttributesSub.next({
    attribute: attrib(),
    done: true,
  });

  await nextTick(10);

  t.deepEqual(called.tajCalled.addSteps, [[{ duration: 123 }]]);
});

test.serial("Runloop creates transitions", async (t) => {
  const { scopedAttributesSub, called } = await setupRunloop();

  await nextTick();

  scopedAttributesSub.next({
    attribute: attrib(),
    done: true,
  });

  await nextTick(10);

  t.deepEqual(called.tajCalled.addTransitions, [
    {
      from: State.Created,
      nodeID: "abc",
      to: State.Running,
    },
  ]);
});

test.serial("Runloop failed resource creation", async (t) => {
  const { scopedAttributesSub, called } = await setupRunloop({
    failAddScope: true,
  });

  const logs = await captureLogsAsync(async function () {
    scopedAttributesSub.next({
      done: true,
    });

    await nextTick();

    scopedAttributesSub.next({
      attribute: attrib(),
      done: true,
    });
    await nextTick();
  });

  t.deepEqual(called.tajCalled.addScopes, []);

  textHasLog(t, logs, "warn", "failing add scopes");
});
