import {
  AddGroupInput,
  AddScopeInput,
  AddStepInput,
  LinkInput,
  TransitionInput,
} from "@empirica/tajriba";
import { ScopeConstructor } from "../shared/scopes";
import { TajribaAdminAccess } from "./context";
import { ScopeSubscriptionInput } from "./subscriptions";

export type Subscriber<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> = (subs: ListenersCollector<Context, Kinds>) => void;

export enum TajribaEvent {
  TransitionAdd = "TRANSITION_ADD",
  ParticipantConnect = "PARTICIPANT_CONNECT",
  ParticipantDisconnect = "PARTICIPANT_DISCONNECT",
}

export enum ListernerPlacement {
  Before,
  None, // Not before or after
  After,
}

export type StartListener<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> = {
  placement: ListernerPlacement;
  callback: (ctx: EventContext<Context, Kinds>) => void;
};

export type TajEventListener<Callback extends Function> = {
  placement: ListernerPlacement;
  event: TajribaEvent;
  callback: Callback;
};

export type KindEventListener<Callback extends Function> = {
  placement: ListernerPlacement;
  kind: string;
  callback: Callback;
};

export type AttributeEventListener<Callback extends Function> = {
  placement: ListernerPlacement;
  kind: string;
  key: string;
  callback: Callback;
};

export type EvtCtxCallback<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> = (ctx: EventContext<Context, Kinds>, props: any) => void;

// Collects event listeners.
export class ListenersCollector<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  readonly starts: StartListener<Context, Kinds>[] = [];
  readonly tajEvents: TajEventListener<EvtCtxCallback<Context, Kinds>>[] = [];
  readonly kindListeners: KindEventListener<
    EvtCtxCallback<Context, Kinds>
  >[] = [];
  readonly attributeListeners: AttributeEventListener<
    EvtCtxCallback<Context, Kinds>
  >[] = [];

  // First callback called.
  on(
    kind: "start",
    callback: (ctx: EventContext<Context, Kinds>) => void
  ): void;

  // Attach to Tajriba Hooks.
  on(event: TajribaEvent, callback: EvtCtxCallback<Context, Kinds>): void;

  // Receive Scopes by Kind as they are fetched.
  on<Kind extends string>(
    kind: Kind,
    callback: EvtCtxCallback<Context, Kinds>
  ): void;

  // Receive Scope attributes as they are fetched.
  on<Kind extends keyof Kinds>(
    kind: Kind,
    key: string,
    callback: EvtCtxCallback<Context, Kinds>
  ): void;

  on(
    kindOrEvent: string,
    keyOrNodeIDOrEventOrCallback?:
      | string
      | TajribaEvent
      | EvtCtxCallback<Context, Kinds>
      | ((ctx: EventContext<Context, Kinds>) => void),
    callback?: EvtCtxCallback<Context, Kinds>
  ): void {
    this.registerListerner(
      ListernerPlacement.None,
      kindOrEvent,
      keyOrNodeIDOrEventOrCallback,
      callback
    );
  }

  before(
    kindOrEvent: string,
    keyOrNodeIDOrEventOrCallback?:
      | string
      | TajribaEvent
      | EvtCtxCallback<Context, Kinds>
      | ((ctx: EventContext<Context, Kinds>) => void),
    callback?: EvtCtxCallback<Context, Kinds>
  ): void {
    this.registerListerner(
      ListernerPlacement.Before,
      kindOrEvent,
      keyOrNodeIDOrEventOrCallback,
      callback
    );
  }

  after(
    kindOrEvent: string,
    keyOrNodeIDOrEventOrCallback?:
      | string
      | TajribaEvent
      | EvtCtxCallback<Context, Kinds>
      | ((ctx: EventContext<Context, Kinds>) => void),
    callback?: EvtCtxCallback<Context, Kinds>
  ): void {
    this.registerListerner(
      ListernerPlacement.After,
      kindOrEvent,
      keyOrNodeIDOrEventOrCallback,
      callback
    );
  }

  private registerListerner(
    placement: ListernerPlacement,
    kindOrEvent: string,
    keyOrNodeIDOrEventOrCallback?:
      | string
      | TajribaEvent
      | EvtCtxCallback<Context, Kinds>
      | ((ctx: EventContext<Context, Kinds>) => void),
    callback?: EvtCtxCallback<Context, Kinds>
  ): void {
    if (kindOrEvent === "start") {
      if (callback) {
        throw new Error("start event only accepts 2 arguments");
      }

      if (typeof keyOrNodeIDOrEventOrCallback !== "function") {
        throw new Error("second argument expected to be a callback");
      }

      this.starts.push({
        placement,
        callback: keyOrNodeIDOrEventOrCallback as (
          ctx: EventContext<Context, Kinds>
        ) => void,
      });

      return;
    }

    if (Object.values(TajribaEvent).includes(kindOrEvent as any)) {
      if (typeof keyOrNodeIDOrEventOrCallback !== "function") {
        throw new Error("second argument expected to be a callback");
      }

      this.tajEvents.push({
        placement,
        event: <TajribaEvent>kindOrEvent,
        callback: keyOrNodeIDOrEventOrCallback,
      });

      return;
    }

    if (typeof keyOrNodeIDOrEventOrCallback === "function") {
      this.kindListeners.push({
        placement,
        kind: kindOrEvent,
        callback: keyOrNodeIDOrEventOrCallback,
      });
    } else {
      if (typeof keyOrNodeIDOrEventOrCallback !== "string") {
        throw new Error("second argument expected to be an attribute key");
      }
      if (typeof callback !== "function") {
        throw new Error("third argument expected to be a callback");
      }

      this.attributeListeners.push({
        placement,
        kind: kindOrEvent,
        key: keyOrNodeIDOrEventOrCallback,
        callback,
      });
    }
  }
}

// Context passed to listerners on new event allowing to subscrive to more data
// and access data.
interface SubscriptionCollector {
  scopeSub: (...inputs: Partial<ScopeSubscriptionInput>[]) => void;
  participantsSub: () => void;
  transitionsSub: (stepID: string) => void;
}

// Context passed to listerners on new event allowing to subscrive to more data
// and access data.
export class EventContext<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  constructor(
    private subs: SubscriptionCollector,
    private taj: TajribaAdminAccess
  ) {}

  scopeSub(...inputs: Partial<ScopeSubscriptionInput>[]) {
    for (const input of inputs) {
      this.subs.scopeSub(input);
    }
  }

  participantsSub() {
    this.subs.participantsSub();
  }

  transitionsSub(stepID: string) {
    this.subs.transitionsSub(stepID);
  }

  // c8 ignore: the TajribaAdminAccess proxy functions are tested elswhere
  /* c8 ignore next 3 */
  addScopes(input: AddScopeInput[]) {
    this.taj.addScopes(input);
  }

  /* c8 ignore next 3 */
  addGroups(input: AddGroupInput[]) {
    this.taj.addGroups(input);
  }

  /* c8 ignore next 3 */
  addLinks(input: LinkInput[]) {
    this.taj.addLinks(input);
  }

  /* c8 ignore next 3 */
  addSteps(input: AddStepInput[]) {
    return this.taj.addSteps(input);
  }

  /* c8 ignore next 3 */
  addTransitions(input: TransitionInput[]) {
    this.taj.addTransitions(input);
  }

  /* c8 ignore next 3 */
  get globals() {
    return this.taj.globals;
  }
}
