import { SetAttributeInput, SubAttributesPayload } from "@empirica/tajriba";
import { Subject } from "rxjs";
import { TajribaProvider } from "./provider";

import { ChangePayload, State } from "@empirica/tajriba";
import { JsonValue } from "../utils/json";
import { Constructor, Scope } from "./scopes";

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
