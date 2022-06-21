import {
  ChangePayload,
  ParticipantIdent,
  SetAttributeInput,
  State,
  SubAttributesPayload,
  Tajriba,
  TajribaAdmin,
  TajribaParticipant,
} from "@empirica/tajriba";
import { ExecutionContext } from "ava";
import { Observable, Subject } from "rxjs";
import { fake, replace, SinonSpy } from "sinon";
import { EventContext } from "../admin/events";
import { ScopeSubscriptionInput } from "../admin/subscriptions";
import { TokenProvider } from "../admin/token_file";
import { TajribaProvider } from "../player/provider";
import { LogLine } from "../utils/console";
import { JsonValue } from "../utils/json";
import { bsu } from "../utils/object";
import { Constructor } from "./helpers";
import { Scope } from "./scopes";
import { TajribaConnection } from "./tajriba_connection";

export const nextTick = (d = 0) =>
  new Promise((resolved) => setTimeout(resolved, d));

export class ErrnoException extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

const fakeTajribaConnectDefaults = {
  id: "123",
  connected: false,
  failSession: false,
  failRegister: false,
  invalidRegister: false,

  failRegisterService: false,
  serviceToken: "abc",
};

export function fakeTajribaConnect(
  props: Partial<typeof fakeTajribaConnectDefaults> = {}
) {
  const {
    id,
    connected,
    failSession,
    failRegister,
    invalidRegister,
    failRegisterService,
    serviceToken,
  } = {
    ...fakeTajribaConnectDefaults,
    ...props,
  };

  const cbs: { [key: string]: (() => any)[] } = {};
  const changes = new Subject<ChangePayload>();
  let tajParticipant: TajribaParticipant;
  let tajAdmin: TajribaAdmin;
  const scopedAttributesSub = new Subject();
  const onEventSub = new Subject();
  const taj = <unknown>(<unknown>{
    id,
    connected,
    globalAttributes(): Observable<SubAttributesPayload> {
      return new Subject<SubAttributesPayload>();
    },
    changes(): Observable<ChangePayload> {
      return changes;
    },
    /* c8 ignore next */
    setAttributes(input: SetAttributeInput[]) {},
    removeAllListeners() {},
    scopedAttributes() {
      return scopedAttributesSub;
    },
    onEvent() {
      return onEventSub;
    },
    registerParticipant(playerIdentifier: string) {
      return new Promise((resolve, reject) => {
        if (failRegister) {
          reject(new Error("failed"));
        } else {
          if (invalidRegister) {
            resolve(["", { id: "", identifier: "" }]);
          } else {
            resolve(["sometoken", { id: "123", identifier: playerIdentifier }]);
          }
        }
      });
    },
    registerService(name: string, serviceRegistrationToken: string) {
      return new Promise((resolve, reject) => {
        if (failRegisterService) {
          reject(new Error("failed"));
        } else {
          resolve(serviceToken);
        }
      });
    },
    sessionParticipant(token: string, pident: ParticipantIdent) {
      return new Promise<TajribaParticipant>((resolve, reject) => {
        if (failSession) {
          reject();
        } else {
          resolve(tajParticipant);
        }
      });
    },
    sessionAdmin(token: string) {
      return new Promise<TajribaAdmin>((resolve, reject) => {
        if (failSession) {
          reject();
        } else {
          resolve(tajAdmin);
        }
      });
    },
    stop() {},
    on(evt: string, cb: () => void) {
      if (!cbs[evt]) {
        cbs[evt] = [];
      }
      cbs[evt]!.push(cb);
    },
  });
  tajParticipant = <TajribaParticipant>taj;
  tajAdmin = <TajribaAdmin>taj;
  const connect = fake.returns(<Tajriba>taj);
  const session = fake.resolves(async () => taj);

  return {
    connect: replace(Tajriba, "connect", connect) as SinonSpy,
    session: replace(
      Tajriba.prototype,
      "sessionParticipant",
      session
    ) as SinonSpy,
    changes,
    cbs,
    scopedAttributesSub,
    onEventSub,
  };
}

export function setupProvider() {
  const attributes = new Map<string, JsonValue | undefined>();
  const changes = new Subject<ChangePayload>();
  const globals = new Subject<SubAttributesPayload>();
  const setAttributes = async (input: SetAttributeInput[]) => {
    for (const at of input) {
      let val: JsonValue | undefined;
      if (at.val) {
        val = JSON.parse(at.val);
      }

      attributes.set(at.key, val);
    }
  };
  const provider = new TajribaProvider(changes, globals, setAttributes);

  return { provider, changes, attributes };
}

interface attrChangeProps {
  done: boolean;
  removed: boolean;
  id: string;
  nodeID: string;
  nodeKind: string;
  noNode: boolean;
  noNodeID: boolean;
  key: string;
  val?: string;
}

const attrChangeDefaults: attrChangeProps = {
  done: true,
  removed: false,
  id: "123",
  nodeID: "abc",
  nodeKind: "game",
  noNode: false,
  noNodeID: false,
  key: "123",
};

interface NodeAttributeChange {
  __typename: "ChangePayload";
  change: {
    __typename: "AttributeChange";
    node?: {
      id: string;
      kind: string;
    };
  };
}

export function attrChange(
  props: Partial<attrChangeProps>
): ChangePayload & NodeAttributeChange {
  let { done, removed, id, nodeID, nodeKind, noNode, noNodeID, key, val } = {
    ...attrChangeDefaults,
    ...props,
  };

  return {
    __typename: "ChangePayload",
    change: {
      __typename: "AttributeChange",
      id,
      nodeID: noNodeID ? "" : nodeID,
      node: noNode
        ? undefined
        : {
            id: nodeID,
            kind: nodeKind,
          },
      deleted: false,
      isNew: false,
      vector: false,
      version: 1,
      key,
      val,
    },
    removed,
    done,
  };
}

interface partChangeProps {
  done: boolean;
  removed: boolean;
  id: string;
}

const partChangeDefaults: partChangeProps = {
  done: true,
  removed: false,
  id: "123",
};

export function partChange(props: Partial<partChangeProps>): ChangePayload {
  const { done, removed, id } = { ...partChangeDefaults, ...props };
  return {
    __typename: "ChangePayload",
    change: {
      __typename: "ParticipantChange",
      id,
    },
    removed,
    done,
  };
}

interface scopeChangeProps {
  done: boolean;
  removed: boolean;
  id: string;
  kind: string | null;
}

const scopeChangeDefaults: scopeChangeProps = {
  done: true,
  removed: false,
  id: "123",
  kind: "scope",
};

export function scopeChange(props: Partial<scopeChangeProps>): ChangePayload {
  const { done, removed, id, kind } = { ...scopeChangeDefaults, ...props };
  return {
    __typename: "ChangePayload",
    change: {
      __typename: "ScopeChange",
      id,
      kind,
    },
    removed,
    done,
  };
}

interface stepChangeProps {
  done: boolean;
  removed: boolean;
  id: string;
  running: boolean;
  ellapsed?: number;
  remaining?: number;
}

const stepChangeDefaults: stepChangeProps = {
  done: true,
  removed: false,
  id: "123",
  running: false,
  // ellapsed: 0,
  // remaining: 10,
};

export function stepChange(props: Partial<stepChangeProps>): ChangePayload {
  const { done, removed, id, running, remaining, ellapsed } = {
    ...stepChangeDefaults,
    ...props,
  };
  return {
    __typename: "ChangePayload",
    change: {
      __typename: "StepChange",
      id,
      running,
      state: State.Created,
      remaining,
      ellapsed,
    },
    removed,
    done,
  };
}

export class Context {
  public hello?: string;
}
export class Stage extends Scope<Context, TestKinds> {}
export class Game extends Scope<Context, TestKinds> {
  get stage() {
    return this.scopeByKey("stageID") as Stage | undefined;
  }

  get badStage() {
    return this.scopeByKey("noStageID") as Stage | undefined;
  }

  // get timer() {
  //   return this.tickerByKey("stepID");
  // }

  // get badTimer() {
  //   return this.tickerByKey("notTickerID");
  // }
}

type TestKinds = {
  game: Constructor<Game>;
  stage: Constructor<Stage>;
};

export const kinds = {
  game: Game,
  stage: Stage,
};

export function textHasLog(
  t: ExecutionContext<unknown>,
  logs: LogLine[],
  level: string,
  log: string
) {
  t.is(logs.length, 1);
  t.regex(logs[0]!.args[0], new RegExp(log));
  t.is(logs[0]!.level, level);
}

const setupTokenProviderDefaults = {
  initToken: "123",
  failRegisterService: false,
  failSession: false,
  connectEarly: false,
};

type setupTokenProviderProps = {
  initToken?: string | null;
  failRegisterService?: boolean;
  failSession?: boolean;
  connectEarly?: boolean;
};

export function setupTokenProvider(
  props: setupTokenProviderProps = setupTokenProviderDefaults
) {
  const { initToken, failRegisterService, failSession, connectEarly } = {
    ...setupTokenProviderDefaults,
    ...props,
  };

  const serviceName = "callbacks";
  const serviceRegistrationToken = "d6w54q3d51qw3";

  const { cbs, scopedAttributesSub, onEventSub } = fakeTajribaConnect({
    failRegisterService,
    failSession,
  });

  const taj = new TajribaConnection("someurl");
  const tokens: string[] = [];
  const tokensbs = bsu<string | null>(initToken);
  const strg = {
    tokens: tokensbs,
    updateToken: async (token: string) => {
      tokens.push(token);
      tokensbs.next(token);
    },
    /* c8 ignore next */
    clearToken: async () => {},
  };

  if (connectEarly) {
    cbs["connected"]![0]!();
  }

  let tokenReset = 0;
  const resetToken = () => {
    tokenReset++;
  };

  const tp = new TokenProvider(
    taj,
    strg,
    serviceName,
    serviceRegistrationToken
  );

  return {
    tp,
    taj,
    cbs,
    strg,
    tokens,
    resetToken,
    scopedAttributesSub,
    onEventSub,
    get tokenReset() {
      return tokenReset;
    },
  };
}

export class AdminBatch extends Scope<Context, AdminKinds> {}
export class AdminGame extends Scope<Context, AdminKinds> {}
export type AdminKinds = {
  batch: Constructor<AdminBatch>;
  game: Constructor<AdminGame>;
};

export const adminKinds = {
  batch: AdminBatch,
  game: AdminGame,
};

export function setupEventContext() {
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

  const ctx = new EventContext<Context, AdminKinds>(coll);

  return { coll, res, ctx };
}
