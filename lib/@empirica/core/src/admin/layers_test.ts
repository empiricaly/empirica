import test from "ava";
import { Subject } from "rxjs";
import { restore } from "sinon";
import { Attribute } from "../shared/attributes";
import { Constructor } from "../shared/helpers";
import { Scope } from "../shared/scopes";
import {
  AdminKinds,
  Context,
  nextTick,
  setupEventContext,
} from "../shared/test_helpers";
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
  const { ctx } = setupEventContext();
  const { withPostCallback } = { ...setupLayerProps, ...props };

  const scopes: { [key: string]: Scope<Context, AdminKinds> } = {
    abc: <Scope<Context, AdminKinds>>{ kind: "game" },
    xyz: <Scope<Context, AdminKinds>>{},
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

  const participants = new Map<string, Participant>();
  const connections = new Subject<Connection>();
  const transitions = new Subject<Transition>();

  const layer = new Layer<Context, AdminKinds>(
    ctx,
    scopesByKind,
    attribute,
    participants
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

  layer.listeners.on("start", (_) => {
    called.start++;
  });

  layer.listeners.on("game", (_, props) => {
    called.game.push(props);
  });

  layer.listeners.on("game", "a", (_, props) => {
    called.gameKeys.push(props);
  });

  layer.listeners.on(TajribaEvent.ParticipantConnect, (_, props) => {
    called.partConnect.push(props);
  });

  layer.listeners.on(TajribaEvent.ParticipantDisconnect, (_, props) => {
    /* c8 ignore next 2 */
    called.partDisconnect.push(props);
  });

  layer.listeners.on(TajribaEvent.TransitionAdd, (_, props) => {
    /* c8 ignore next 2 */
    called.transitionAdd.push(props);
  });

  return {
    layer,
    called,
    kindScopes,
    attributes,
    scopes,
    participants,
    connections,
    transitions,
  };
}

test.serial("Layer kind subs called with existing kind", async (t) => {
  const { layer, called, kindScopes } = setupLayer({ withPostCallback: true });

  const game = <Scope<Context, AdminKinds>>{};
  kindScopes.set("game", new Map().set("abc", game));

  t.is(called.game.length, 0);
  t.is(called.cbcalled, 0);

  await layer.start();
  await nextTick();

  t.is(called.game.length, 1);
  t.deepEqual(called.game[0], { game });
  t.is(called.cbcalled, 1);
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
