import { State } from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import { restore } from "sinon";
import { Attribute } from "../shared/attributes";
import { Constructor } from "../shared/helpers";
import { Scope } from "../shared/scopes";
import { AdminKinds, Context, setupEventContext } from "../shared/test_helpers";
import { TajribaEvent } from "./events";
import { Layer } from "./layers";
import { Connection, Participant } from "./participants";
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
  const { res, ctx } = setupEventContext();
  const { withPostCallback } = { ...setupLayerProps, ...props };

  const scopes: { [key: string]: Scope<Context, AdminKinds> } = {
    abc: <Scope<Context, AdminKinds>>{ kind: "game" },
    xyz: <Scope<Context, AdminKinds>>{},
  };

  const scope = (id: string) => {
    return scopes[id];
  };

  const kindScopes = new Map<string, Map<string, Scope<Context, AdminKinds>>>();
  const scopesByKind = (kind: keyof AdminKinds) => {
    if (!kindScopes.has(kind)) {
      kindScopes.set(kind, new Map());
    }

    return kindScopes.get(kind)!;
  };

  const attributes: { [key: string]: Attribute } = {};
  const attribute = (scopeID: string, key: string) => {
    return attributes[scopeID + "-" + key];
  };

  const kindsSubs = new Map<string, Subject<Scope<Context, Kinds>>>();
  const kindSubscription = (kind: keyof AdminKinds) => {
    let sub = kindsSubs.get(kind);
    if (!sub) {
      sub = new Subject<Scope<Context, Kinds>>();
      kindsSubs.set(kind, sub);
    }

    return sub;
  };

  const attribSubs = new Map<string, Subject<Attribute>>();
  const attributeSubscription = (kind: string, key: string) => {
    const k = kind + "-" + key;
    let sub = attribSubs.get(k);
    if (!sub) {
      sub = new Subject<Attribute>();
      attribSubs.set(k, sub);
    }

    return sub;
  };

  const participants = new Map<string, Participant>();
  const connections = new Subject<Connection>();
  const transitions = new Subject<Transition>();

  const layer = new Layer<Context, AdminKinds>(
    ctx,
    scope,
    scopesByKind,
    attribute,
    kindSubscription,
    attributeSubscription,
    participants,
    connections,
    transitions
  );

  const called: {
    start: number;
    game: any[];
    gameKeys: any[];
    cbcalled: number;
    partConnect: any[];
    partDisconnect: any[];
    transitionAdd: any[];
  } = {
    start: 0,
    game: [],
    gameKeys: [],
    cbcalled: 0,
    partConnect: [],
    partDisconnect: [],
    transitionAdd: [],
  };

  if (withPostCallback) {
    layer.postCallback = async () => {
      called.cbcalled++;
    };
  }

  layer.listeners.on("start", (ctx) => {
    called.start++;
  });

  layer.listeners.on("game", (ctx, props) => {
    called.game.push(props);
  });

  layer.listeners.on("game", "a", (ctx, props) => {
    called.gameKeys.push(props);
  });

  layer.listeners.on(TajribaEvent.ParticipantConnect, (ctx, props) => {
    called.partConnect.push(props);
  });

  layer.listeners.on(TajribaEvent.ParticipantDisconnect, (ctx, props) => {
    called.partDisconnect.push(props);
  });

  layer.listeners.on(TajribaEvent.TransitionAdd, (ctx, props) => {
    called.transitionAdd.push(props);
  });

  return {
    layer,
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

test.serial("Layer start called", async (t) => {
  const { layer, called } = setupLayer();

  t.is(called.start, 0);

  await layer.start();

  t.is(called.start, 1);
});

test.serial("Layer kind subs called", async (t) => {
  const { layer, called, kindsSubs } = setupLayer();

  await layer.start();

  t.is(called.game.length, 0);

  const game = <Scope<Context, AdminKinds>>{};
  kindsSubs.get("game")!.next(game);

  t.is(called.game.length, 1);
  t.deepEqual(called.game[0], { game });
});

test.serial("Layer kind subs called with postCallback", async (t) => {
  const { layer, called, kindsSubs } = setupLayer({
    withPostCallback: true,
  });

  await layer.start();

  t.is(called.cbcalled, 0);

  const game = <Scope<Context, AdminKinds>>{};
  kindsSubs.get("game")!.next(game);

  t.is(called.cbcalled, 1);
});

test.serial("Layer kind subs called with existing kind", async (t) => {
  const { layer, called, kindScopes } = setupLayer({ withPostCallback: true });

  const game = <Scope<Context, AdminKinds>>{};
  kindScopes.set("game", new Map().set("abc", game));

  t.is(called.game.length, 0);
  t.is(called.cbcalled, 0);

  await layer.start();

  t.is(called.game.length, 1);
  t.deepEqual(called.game[0], { game });
  t.is(called.cbcalled, 1);
});

test.serial("Layer attribute subs called", async (t) => {
  const { layer, called, attribSubs, scopes } = setupLayer();

  await layer.start();

  t.is(called.gameKeys.length, 0);

  const attribute = <Attribute>{ value: "hey", nodeID: "abc" };
  attribSubs.get("game-a")!.next(attribute);

  t.is(called.gameKeys.length, 1);
  t.deepEqual(called.gameKeys[0], { attribute, a: "hey", game: scopes["abc"] });
});

test.serial("Layer attribute subs called with postCallback", async (t) => {
  const { layer, called, attribSubs } = setupLayer({
    withPostCallback: true,
  });

  await layer.start();

  t.is(called.cbcalled, 0);

  const attribute = <Attribute>{ value: "hey", nodeID: "abc" };
  attribSubs.get("game-a")!.next(attribute);

  t.is(called.cbcalled, 1);
});

test.serial("Layer attribute subs called without kind", async (t) => {
  const { layer, called, attribSubs, scopes } = setupLayer();

  await layer.start();

  t.is(called.gameKeys.length, 0);

  const attribute = <Attribute>{ value: "hey", nodeID: "xyz" };
  attribSubs.get("game-a")!.next(attribute);

  t.is(called.gameKeys.length, 1);
  t.deepEqual(called.gameKeys[0], { attribute, a: "hey", game: scopes["xyz"] });
});

test.serial("Layer attribute subs called without node", async (t) => {
  const { layer, called, attribSubs } = setupLayer();

  await layer.start();

  t.is(called.gameKeys.length, 0);

  const attribute = <Attribute>{ value: "hey" };
  attribSubs.get("game-a")!.next(attribute);

  t.is(called.gameKeys.length, 1);
  t.deepEqual(called.gameKeys[0], { attribute, a: "hey" });
});

test.serial("Layer attribute subs with existing attribute", async (t) => {
  const { layer, called, scopes, kindScopes, attributes } = setupLayer({
    withPostCallback: true,
  });

  const game = <Scope<Context, AdminKinds>>{};
  kindScopes.set("game", new Map().set("abc", game));

  const attribute = <Attribute>{ value: "hey", nodeID: "xyz" };
  attributes["abc-a"] = attribute;

  t.is(called.gameKeys.length, 0);
  t.is(called.cbcalled, 0);

  await layer.start();

  t.is(called.gameKeys.length, 1);
  t.deepEqual(called.gameKeys[0], { attribute, a: "hey", game: scopes["xyz"] });
  t.is(called.cbcalled, 2);
});

test.serial("Layer participant connect subs called", async (t) => {
  const { layer, called, connections } = setupLayer();

  await layer.start();

  t.is(called.partConnect.length, 0);

  const participant = {
    id: "1",
    identifier: "a",
  };
  connections.next({
    connected: true,
    participant,
  });

  t.is(called.partConnect.length, 1);
  t.deepEqual(called.partConnect[0], { participant });

  connections.next({
    connected: false,
    participant,
  });

  t.is(called.partConnect.length, 1);
  t.deepEqual(called.partConnect[0], { participant });
});

test.serial("Layer participant already connected", async (t) => {
  const { layer, called, participants } = setupLayer({
    withPostCallback: true,
  });

  t.is(called.cbcalled, 0);
  t.is(called.partConnect.length, 0);

  const participant = {
    id: "1",
    identifier: "a",
  };
  participants.set("1", participant);

  await layer.start();

  t.is(called.partConnect.length, 1);
  t.deepEqual(called.partConnect[0], { participant });
  t.is(called.cbcalled, 1);
});

test.serial("Layer participant connect with postCallback", async (t) => {
  const { layer, called, connections } = setupLayer({ withPostCallback: true });

  await layer.start();

  t.is(called.cbcalled, 0);

  const participant = {
    id: "1",
    identifier: "a",
  };
  connections.next({
    connected: true,
    participant,
  });

  t.is(called.cbcalled, 1);
});

test.serial("Layer participant disconnect subs called", async (t) => {
  const { layer, called, connections } = setupLayer();

  await layer.start();

  t.is(called.partDisconnect.length, 0);

  const participant = {
    id: "1",
    identifier: "a",
  };
  connections.next({
    connected: false,
    participant,
  });

  t.is(called.partDisconnect.length, 1);
  t.deepEqual(called.partDisconnect[0], { participant });

  connections.next({
    connected: true,
    participant,
  });

  t.is(called.partDisconnect.length, 1);
  t.deepEqual(called.partDisconnect[0], { participant });
});

test.serial("Layer participant disconnect with postCallback", async (t) => {
  const { layer, called, connections } = setupLayer({ withPostCallback: true });

  await layer.start();

  t.is(called.cbcalled, 0);

  const participant = {
    id: "1",
    identifier: "a",
  };
  connections.next({
    connected: false,
    participant,
  });

  t.is(called.cbcalled, 1);
});

test.serial("Layer transition subs called", async (t) => {
  const { layer, called, transitions } = setupLayer();

  await layer.start();

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

test.serial("Layer transition subs with postCallback", async (t) => {
  const { layer, called, transitions } = setupLayer({ withPostCallback: true });

  await layer.start();

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

  t.is(called.cbcalled, 1);
});
