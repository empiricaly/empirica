import {
  AddGroupInput,
  AddScopeInput,
  AddStepInput,
  ChangePayload,
  LinkInput,
  ParticipantIdent,
  ScopesQueryVariables,
  SetAttributeInput,
  State,
  SubAttributesPayload,
  Tajriba,
  TajribaAdmin,
  TajribaParticipant,
  TransitionInput,
} from "@empirica/tajriba";
import { ExecutionContext } from "ava";
import { Observable, Subject } from "rxjs";
import { fake, replace, SinonSpy } from "sinon";
import { Scopes } from "../admin";
import { Finalizer, TajribaAdminAccess } from "../admin/context";
import { EventContext } from "../admin/events";
import { Globals } from "../admin/globals";
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

  failAddScope: false,
  failScopes: false,
  noScopes: false,
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
    failAddScope,
    failScopes,
    noScopes,
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
  const called: {
    setAttributes: SetAttributeInput[][];
    addScopes: AddScopeInput[][];
    addGroups: AddGroupInput[][];
    addTransitions: TransitionInput[][];
    addLink: LinkInput[][];
    addSteps: AddStepInput[][];
  } = {
    setAttributes: [],
    addScopes: [],
    addGroups: [],
    addTransitions: [],
    addLink: [],
    addSteps: [],
  };
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
    setAttributes: async (input: SetAttributeInput[]) => {
      called.setAttributes.push(input);
    },
    addScopes: async (input: AddScopeInput[]) => {
      if (failAddScope) {
        throw new Error("failing add scopes");
      }
      called.addScopes.push(input);
    },
    scopes: async (_: ScopesQueryVariables) => {
      if (failScopes) {
        throw new Error("failing scopes");
      }

      if (noScopes) {
        return {
          __typename: "ScopeConnection",
          edges: [],
        };
      }

      return {
        __typename: "ScopeConnection",
        pageInfo: {
          hasNextPage: false,
        },
        edges: [
          {
            __typename: "ScopeEdge",
            cursor: "123",
            node: {
              __typename: "Scope",
              id: "globals",
              /** kind is an optional type name. */
              kind: "globals",
              name: "globals",
              attributes: {},
            },
          },
        ],
      };
    },
    addGroups: async (input: AddGroupInput[]) => {
      called.addGroups.push(input);
    },
    transition: async (input: TransitionInput[]) => {
      called.addTransitions.push(input);
    },
    addLink: async (input: LinkInput[]) => {
      called.addLink.push(input);
    },
    addSteps: async (input: AddStepInput[]) => {
      called.addSteps.push(input);
    },
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
    registerService(_: string, __: string) {
      return new Promise((resolve, reject) => {
        if (failRegisterService) {
          reject(new Error("failed"));
        } else {
          resolve(serviceToken);
        }
      });
    },
    sessionParticipant(_: string, __: ParticipantIdent) {
      return new Promise<TajribaParticipant>((resolve, reject) => {
        if (failSession) {
          reject("failed");
        } else {
          resolve(tajParticipant);
        }
      });
    },
    sessionAdmin(_: string) {
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
    called,
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
export class Game extends Scope<Context, TestKinds> {}

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
  log: string,
  len: number = 1
) {
  if (logs.length > len) {
    console.log(logs);
  }
  t.is(logs.length, len);
  t.regex(logs[0]!.args[0], new RegExp(log));
  t.is(logs[0]!.level, level);
}

const setupTokenProviderDefaults = {
  initToken: "123",
  failRegisterService: false,
  failSession: false,
  failAddScope: false,
  failScopes: false,
  noScopes: false,
};

type setupTokenProviderProps = {
  initToken?: string | null;
  failRegisterService?: boolean;
  failSession?: boolean;
  failAddScope?: boolean;
  failScopes?: boolean;
  noScopes?: boolean;
};

export function setupTokenProvider(
  props: setupTokenProviderProps = setupTokenProviderDefaults
) {
  const {
    initToken,
    failRegisterService,
    failSession,
    failAddScope,
    failScopes,
    noScopes,
  } = {
    ...setupTokenProviderDefaults,
    ...props,
  };

  const serviceName = "callbacks";
  const serviceRegistrationToken = "d6w54q3d51qw3";

  const { cbs, scopedAttributesSub, onEventSub, called } = fakeTajribaConnect({
    failRegisterService,
    failSession,
    failAddScope,
    failScopes,
    noScopes,
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
    called,
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

  const called: {
    finalizers: Finalizer[];
    addScopes: AddScopeInput[][];
    addGroups: AddGroupInput[][];
    addLinks: LinkInput[][];
    addSteps: AddStepInput[][];
    addTransitions: TransitionInput[][];
    setAttributes: SetAttributeInput[][];
  } = {
    finalizers: [],
    addScopes: [],
    addGroups: [],
    addLinks: [],
    addSteps: [],
    addTransitions: [],
    setAttributes: [],
  };

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
    new Globals(globals, "globals", async (input: SetAttributeInput[]) => {
      /* c8 ignore next 2 */
      called.setAttributes.push(input);
    })
  );

  const ctx = new EventContext<Context, AdminKinds>(
    coll,
    mut,
    <Scopes<Context, AdminKinds>>{}
  );

  return { coll, res, ctx, called, globals };
}
