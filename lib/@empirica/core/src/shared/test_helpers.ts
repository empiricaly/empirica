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
import { TokenProvider } from "../admin/token_file";
import { TajribaProvider } from "../player/provider";
import { Constructor, Scope } from "../player/scopes";
import { LogLine } from "../utils/console";
import { JsonValue } from "../utils/json";
import { bsu } from "../utils/object";
import { TajribaConnection } from "./tajriba_connection";

export const nextTick = (d = 0) =>
  new Promise((resolved) => setTimeout(resolved, d));

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
  const taj = <Tajriba>(<unknown>{
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
  const connect = fake.returns(taj);
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
  key: string;
  val?: string;
}

const attrChangeDefaults: attrChangeProps = {
  done: true,
  removed: false,
  id: "123",
  nodeID: "abc",
  key: "123",
};

export function attrChange(props: Partial<attrChangeProps>): ChangePayload {
  let { done, removed, id, nodeID, key, val } = {
    ...attrChangeDefaults,
    ...props,
  };

  return {
    __typename: "ChangePayload",
    change: {
      __typename: "AttributeChange",
      id,
      nodeID,
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

  get timer() {
    return this.tickerByKey("stepID");
  }

  get badTimer() {
    return this.tickerByKey("notTickerID");
  }
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
};

type setupTokenProviderProps = {
  initToken?: string;
  failRegisterService?: boolean;
  failSession?: boolean;
};

export function setupTokenProvider(
  props: setupTokenProviderProps = setupTokenProviderDefaults
) {
  const { initToken, failRegisterService, failSession } = {
    ...setupTokenProviderDefaults,
    ...props,
  };

  const serviceName = "callbacks";
  const serviceRegistrationToken = "d6w54q3d51qw3";

  const { cbs } = fakeTajribaConnect({ failRegisterService, failSession });

  const taj = new TajribaConnection("someurl");
  const tokens: string[] = [];
  const tokensbs = bsu<string>(initToken);
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
    get tokenReset() {
      return tokenReset;
    },
  };
}
