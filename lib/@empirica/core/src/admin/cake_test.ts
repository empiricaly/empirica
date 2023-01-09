import { State } from "@empirica/tajriba";
import test from "ava";
import { Subject, ReplaySubject } from "rxjs";
import { restore } from "sinon";
import { Attribute } from "../shared/attributes";
import { Constructor } from "../shared/helpers";
import {
  AdminKinds,
  Context,
  nextTick,
  setupEventContext,
} from "../shared/test_helpers";
import { AttributeMsg } from "./attributes";
import { Cake } from "./cake";
import { ListenersCollector, TajribaEvent } from "./events";
import { ConnectionMsg, Participant } from "./participants";
import { Scope, ScopeMsg } from "./scopes";
import { Transition } from "./transitions";

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

test.serial.afterEach(() => {
  restore();
});

const setupLayerProps = {
  withPostCallback: false,
};

function setupLayer(props: typeof setupLayerProps = setupLayerProps) {
  const { ctx } = setupEventContext();
  const { withPostCallback } = { ...setupLayerProps, ...props };

  const scopes: { [key: string]: Scope<Context, AdminKinds> } = {
    abc: <Scope<Context, AdminKinds>>{ kind: "game" },
    xyz: <Scope<Context, AdminKinds>>{},
  };

  const scope = (id: string) => {
    return scopes[id];
  };

  const kindScopes = new Map<string, Map<string, Scope<Context, AdminKinds>>>();

  const attributes: { [key: string]: Attribute } = {};

  const kindsSubs = new Map<string, Subject<ScopeMsg<Context, AdminKinds>>>();
  const kindSubscription = (kind: keyof AdminKinds) => {
    let sub = kindsSubs.get(kind);
    if (!sub) {
      sub = new ReplaySubject<ScopeMsg<Context, AdminKinds>>();
      sub.next({ done: true });
      kindsSubs.set(kind, sub);
    }

    return sub;
  };

  const attribSubs = new Map<string, Subject<AttributeMsg>>();
  const attributeSubscription = (kind: string, key: string) => {
    const k = kind + "-" + key;
    let sub = attribSubs.get(k);
    if (!sub) {
      sub = new ReplaySubject<AttributeMsg>();
      sub.next({ done: true });
      attribSubs.set(k, sub);
    }

    return sub;
  };

  const participants = new Map<string, Participant>();
  const connections = new Subject<ConnectionMsg>();
  const transitions = new Subject<Transition>();

  const cake = new Cake<Context, AdminKinds>(
    ctx,
    scope,
    kindSubscription,
    attributeSubscription,
    connections,
    transitions
  );

  const called: {
    game: any[];
    gameKeys: any[];
    cbcalled: number;
    partConnect: any[];
    partDisconnect: any[];
    transitionAdd: any[];
  } = {
    game: [],
    gameKeys: [],
    cbcalled: 0,
    partConnect: [],
    partDisconnect: [],
    transitionAdd: [],
  };

  if (withPostCallback) {
    cake.postCallback = async () => {
      called.cbcalled++;
    };
  }

  const listeners = new ListenersCollector<Context, AdminKinds>();
  listeners.on("game", (_, props) => {
    called.game.push(props);
  });

  listeners.on("game", "a", (_, props) => {
    called.gameKeys.push(props);
  });

  listeners.on(TajribaEvent.ParticipantConnect, (_, props) => {
    called.partConnect.push(props);
  });

  listeners.on(TajribaEvent.ParticipantDisconnect, (_, props) => {
    called.partDisconnect.push(props);
  });

  listeners.on(TajribaEvent.TransitionAdd, (_, props) => {
    called.transitionAdd.push(props);
  });

  return {
    cake,
    listeners,
    called,
    kindsSubs,
    kindScopes,
    attribSubs,
    attributes,
    scopes,
    participants,
    connections,
    transitions,
  };
}

test.serial("Cake kind subs called", async (t) => {
  const { cake, listeners, called, kindsSubs } = setupLayer();

  await cake.add(listeners);

  t.is(called.game.length, 0);

  const game = <Scope<Context, AdminKinds>>{};
  kindsSubs.get("game")!.next({ scope: game, done: true });

  t.is(called.game.length, 1);
  t.deepEqual(called.game[0], { game });
});

test.serial("Cake kind subs called with postCallback", async (t) => {
  const { cake, listeners, called, kindsSubs } = setupLayer({
    withPostCallback: true,
  });

  await cake.add(listeners);

  t.is(called.cbcalled, 0);

  const game = <Scope<Context, AdminKinds>>{};
  kindsSubs.get("game")!.next({ scope: game, done: true });
  await nextTick();

  t.is(called.cbcalled, 1);
});

test.serial("Cake attribute subs called", async (t) => {
  const { cake, listeners, called, attribSubs, scopes } = setupLayer();

  await cake.add(listeners);

  t.is(called.gameKeys.length, 0);

  const attribute = <Attribute>{ value: "hey", nodeID: "abc" };
  attribSubs.get("game-a")!.next({ attribute, done: true });

  t.is(called.gameKeys.length, 1);
  t.deepEqual(called.gameKeys[0], { attribute, a: "hey", game: scopes["abc"] });
});

test.serial("Cake attribute subs called with postCallback", async (t) => {
  const { cake, listeners, called, attribSubs } = setupLayer({
    withPostCallback: true,
  });

  await cake.add(listeners);

  t.is(called.cbcalled, 0);

  const attribute = <Attribute>{ value: "hey", nodeID: "abc" };
  attribSubs.get("game-a")!.next({ attribute, done: true });
  await nextTick();

  t.is(called.cbcalled, 1);
});

test.serial("Cake attribute subs called without kind", async (t) => {
  const { cake, listeners, called, attribSubs, scopes } = setupLayer();

  await cake.add(listeners);

  t.is(called.gameKeys.length, 0);

  const attribute = <Attribute>{ value: "hey", nodeID: "xyz" };
  attribSubs.get("game-a")!.next({ attribute, done: true });
  await nextTick();

  t.is(called.gameKeys.length, 1);
  t.deepEqual(called.gameKeys[0], { attribute, a: "hey", game: scopes["xyz"] });
});

test.serial("Cake attribute subs called without node", async (t) => {
  const { cake, listeners, called, attribSubs } = setupLayer();

  await cake.add(listeners);

  t.is(called.gameKeys.length, 0);

  const attribute = <Attribute>{ value: "hey" };
  attribSubs.get("game-a")!.next({ attribute, done: true });
  await nextTick();

  t.is(called.gameKeys.length, 1);
  t.deepEqual(called.gameKeys[0], { attribute, a: "hey" });
});

test.serial("Cake participant connect subs called", async (t) => {
  const { cake, listeners, called, connections } = setupLayer();

  await cake.add(listeners);

  t.is(called.partConnect.length, 0);

  const participant = {
    id: "1",
    identifier: "a",
  };
  connections.next({
    connection: {
      connected: true,
      participant,
    },
    done: true,
  });

  t.is(called.partConnect.length, 1);
  t.deepEqual(called.partConnect[0], { participant });

  connections.next({
    connection: {
      connected: false,
      participant,
    },
    done: true,
  });

  t.is(called.partConnect.length, 1);
  t.deepEqual(called.partConnect[0], { participant });
});

test.serial("Cake participant connect with postCallback", async (t) => {
  const { cake, listeners, called, connections } = setupLayer({
    withPostCallback: true,
  });

  await cake.add(listeners);

  t.is(called.cbcalled, 0);

  const participant = {
    id: "1",
    identifier: "a",
  };
  connections.next({
    connection: {
      connected: true,
      participant,
    },
    done: true,
  });
  await nextTick();

  t.is(called.cbcalled, 1);
});

test.serial("Cake participant disconnect subs called", async (t) => {
  const { cake, listeners, called, connections } = setupLayer();

  await cake.add(listeners);

  t.is(called.partDisconnect.length, 0);

  const participant = {
    id: "1",
    identifier: "a",
  };
  connections.next({
    connection: {
      connected: false,
      participant,
    },
    done: true,
  });

  t.is(called.partDisconnect.length, 1);
  t.deepEqual(called.partDisconnect[0], { participant });

  connections.next({
    connection: {
      connected: true,
      participant,
    },
    done: true,
  });

  t.is(called.partDisconnect.length, 1);
  t.deepEqual(called.partDisconnect[0], { participant });
});

test.serial("Cake participant disconnect with postCallback", async (t) => {
  const { cake, listeners, called, connections } = setupLayer({
    withPostCallback: true,
  });

  await cake.add(listeners);

  t.is(called.cbcalled, 0);

  const participant = {
    id: "1",
    identifier: "a",
  };
  connections.next({
    connection: {
      connected: false,
      participant,
    },
    done: true,
  });
  await nextTick();

  t.is(called.cbcalled, 1);
});

test.serial("Cake transition subs called", async (t) => {
  const { cake, listeners, called, transitions } = setupLayer();

  await cake.add(listeners);

  t.is(called.transitionAdd.length, 0);

  const step = {
    id: "abc",
    duration: 100,
    state: State.Running,
  };
  const transition = {
    from: State.Created,
    to: State.Running,
    id: "123",
    step,
  };
  transitions.next(transition);

  t.is(called.transitionAdd.length, 1);
  t.deepEqual(called.transitionAdd[0], { transition, step });
});

test.serial("Cake transition subs with postCallback", async (t) => {
  const { cake, listeners, called, transitions } = setupLayer({
    withPostCallback: true,
  });

  await cake.add(listeners);

  t.is(called.cbcalled, 0);

  const step = {
    id: "abc",
    duration: 100,
    state: State.Running,
  };
  const transition = {
    from: State.Created,
    to: State.Running,
    id: "123",
    step,
  };
  transitions.next(transition);
  await nextTick();

  t.is(called.cbcalled, 1);
});

test.serial("Cake callbacks called in correct order", async (t) => {
  const { cake, kindsSubs } = setupLayer();

  const listeners = new ListenersCollector<Context, AdminKinds>();

  const vals: string[] = [];
  listeners.after("game", () => {
    vals.push("after");
  });

  listeners.on("game", () => {
    vals.push("none1");
  });

  listeners.on("game", () => {
    vals.push("none2");
  });

  listeners.before("game", () => {
    vals.push("before");
  });

  await cake.add(listeners);

  t.is(vals.length, 0);

  const game = <Scope<Context, AdminKinds>>{};
  kindsSubs.get("game")!.next({ scope: game, done: true });

  await nextTick();

  t.is(vals.length, 4);
  t.deepEqual(vals, ["before", "none1", "none2", "after"]);
});

test.serial("Cake callbacks in order over multiple listeners", async (t) => {
  const { cake, kindsSubs } = setupLayer();

  const listeners1 = new ListenersCollector<Context, AdminKinds>();

  const vals: string[] = [];
  listeners1.after("game", () => {
    vals.push("after");
  });

  listeners1.on("game", () => {
    vals.push("none1");
  });

  const listeners2 = new ListenersCollector<Context, AdminKinds>();

  listeners2.on("game", () => {
    vals.push("none2");
  });

  listeners2.before("game", () => {
    vals.push("before");
  });

  await cake.add(listeners1);
  await cake.add(listeners2);

  t.is(vals.length, 0);

  const game = <Scope<Context, AdminKinds>>{};
  kindsSubs.get("game")!.next({ scope: game, done: true });

  await nextTick();

  t.is(vals.length, 4);
  t.deepEqual(vals, ["before", "none1", "none2", "after"]);
});
