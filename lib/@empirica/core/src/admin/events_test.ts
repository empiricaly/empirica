import test from "ava";
import { Constructor } from "../shared/scopes";
import { Context } from "../shared/test_helpers";
import { EventContext, ListenersCollector, TajribaEvent } from "./events";
import { Scope } from "./scopes";
import { ScopeSubscriptionInput } from "./subscriptions";

export class Batch extends Scope<Context, Kinds> {}
export class Game extends Scope<Context, Kinds> {}
type Kinds = {
  batch: Constructor<Batch>;
  game: Constructor<Game>;
};

export const kinds = {
  batch: Batch,
  game: Game,
};

test.serial("ListenersCollector tracks listeners", async (t) => {
  const listeners = new ListenersCollector<Context, Kinds>();

  const startCB = (ctx: EventContext<Context, Kinds>) => {};
  listeners.on("start", startCB);
  t.deepEqual(listeners.starts, [startCB]);

  const tajCB = (ctx: EventContext<Context, Kinds>) => {};
  listeners.on(TajribaEvent.ParticipantConnect, tajCB);
  t.deepEqual(listeners.tajEvents, [
    { event: TajribaEvent.ParticipantConnect, callback: tajCB },
  ]);

  listeners.on(TajribaEvent.TransitionAdd, "123", tajCB);
  t.deepEqual(listeners.tajEvents, [
    { event: TajribaEvent.ParticipantConnect, callback: tajCB },
    { event: TajribaEvent.TransitionAdd, nodeID: "123", callback: tajCB },
  ]);

  const kindCB = (ctx: EventContext<Context, Kinds>) => {};
  listeners.on("game", kindCB);
  t.deepEqual(listeners.kindEvents, [{ kind: "game", callback: kindCB }]);

  const attribCB = (ctx: EventContext<Context, Kinds>) => {};
  listeners.on("game", "something", attribCB);
  t.deepEqual(listeners.attributeEvents, [
    { kind: "game", key: "something", callback: attribCB },
  ]);
});

test.serial("ListenersCollector fails with wrong start", async (t) => {
  const listeners = new ListenersCollector<Context, Kinds>();

  const startCB = (ctx: EventContext<Context, Kinds>) => {};

  t.throws(
    () => {
      // @ts-ignore
      listeners.on("start", startCB, startCB);
      /* c8 ignore next */
    },
    { message: /only accepts 2 arguments/ }
  );

  t.throws(
    () => {
      // @ts-ignore
      listeners.on("start", "nope");
      /* c8 ignore next */
    },
    { message: /be a callback/ }
  );
});

test.serial("ListenersCollector fails with wrong tajriba event", async (t) => {
  const listeners = new ListenersCollector<Context, Kinds>();

  const tajCB = (ctx: EventContext<Context, Kinds>) => {};

  t.throws(
    () => {
      // @ts-ignore
      listeners.on(TajribaEvent.ParticipantConnect, "");
      /* c8 ignore next */
    },
    { message: /be a callback/ }
  );

  t.throws(
    () => {
      // @ts-ignore
      listeners.on(TajribaEvent.ParticipantConnect, 1);
      /* c8 ignore next */
    },
    { message: /be a callback/ }
  );
});

test.serial(
  "ListenersCollector fails with wrong attribute event",
  async (t) => {
    const listeners = new ListenersCollector<Context, Kinds>();

    const tajCB = (ctx: EventContext<Context, Kinds>) => {};

    t.throws(
      () => {
        // @ts-ignore
        listeners.on("game", 1);
        /* c8 ignore next */
      },
      { message: /be an attribute key/ }
    );

    t.throws(
      () => {
        // @ts-ignore
        listeners.on("game", "somekey", "nope");
        /* c8 ignore next */
      },
      { message: /be a callback/ }
    );
  }
);

function setupEventContext() {
  const res: {
    scopeSub: Partial<ScopeSubscriptionInput>[];
    participantsSub: number;
    transitionsSub: string[];
  } = {
    scopeSub: [],
    participantsSub: 0,
    transitionsSub: [],
  };
  const coll = {
    scopeSub: (...inputs: Partial<ScopeSubscriptionInput>[]) => {
      for (const input of inputs) {
        res.scopeSub.push(input);
      }
    },
    participantsSub: () => {
      res.participantsSub++;
    },
    transitionsSub: (stepID: string) => {
      res.transitionsSub.push(stepID);
    },
  };

  const ctx = new EventContext<Context, Kinds>(coll);

  return { coll, res, ctx };
}

test.serial("EventContext ", async (t) => {
  const { res, ctx } = setupEventContext();

  t.is(res.participantsSub, 0);
  ctx.participantsSub();
  t.is(res.participantsSub, 1);

  ctx.scopeSub({ ids: ["123"] });
  t.deepEqual(res.scopeSub, [{ ids: ["123"] }]);

  ctx.scopeSub({ ids: ["abc"] }, { ids: ["xyz"] });
  t.deepEqual(res.scopeSub, [
    { ids: ["123"] },
    { ids: ["abc"] },
    { ids: ["xyz"] },
  ]);

  ctx.transitionsSub("1");
  t.deepEqual(res.transitionsSub, ["1"]);

  ctx.transitionsSub("2");
  t.deepEqual(res.transitionsSub, ["1", "2"]);
});
