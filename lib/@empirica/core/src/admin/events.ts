import { ScopeConstructor } from "./scopes";
import { ScopeSubscriptionInput, Subscriptions } from "./subscriptions";

export type Subscriber<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> = (subs: ListenersCollector<Context, Kinds>) => void;

export enum TajribaEvent {
  TransitionAdd = "TRANSITION_ADD",
  ParticipantConnect = "PARTICIPANT_CONNECT",
  ParticipantDisconnect = "PARTICIPANT_DISCONNECT",
  ParticipantConnected = "PARTICIPANT_CONNECTED",
}

type TajEventSub<Callback extends Function> = {
  event: TajribaEvent;
  nodeID?: string;
  callback: Callback;
};

type KindEventSub<Callback extends Function> = {
  kind: string;
  callback: Callback;
};

type AttributeEventSub<Callback extends Function> = {
  kind: string;
  key: string;
  callback: Callback;
};

type EvtCtxCallback<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> = (ctx: EventContext<Context, Kinds>, props: any) => void;

// Collects event listeners.
export class ListenersCollector<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  readonly starts: EvtCtxCallback<Context, Kinds>[] = [];
  readonly tajEvents: TajEventSub<EvtCtxCallback<Context, Kinds>>[] = [];
  readonly kindEvents: KindEventSub<EvtCtxCallback<Context, Kinds>>[] = [];
  readonly attributeEvents: AttributeEventSub<
    EvtCtxCallback<Context, Kinds>
  >[] = [];

  // First callback called.
  on(kind: "start", callback: EvtCtxCallback<Context, Kinds>): void;

  // Attach to Tajriba Hooks.
  on(event: TajribaEvent, callback: EvtCtxCallback<Context, Kinds>): void;

  // Attach to Tajriba Hooks per NodeID.
  on(
    event: TajribaEvent,
    nodeID: string,
    callback: EvtCtxCallback<Context, Kinds>
  ): void;

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
      | EvtCtxCallback<Context, Kinds>,
    callback?: EvtCtxCallback<Context, Kinds>
  ): void {
    if (kindOrEvent === "start") {
      if (callback) {
        throw new Error("start event only accepts 2 arguments");
      }

      if (typeof keyOrNodeIDOrEventOrCallback !== "function") {
        throw new Error("second argument expected to be a callback");
      }

      this.starts.push(keyOrNodeIDOrEventOrCallback);

      return;
    }

    if (Object.values(TajribaEvent).includes(kindOrEvent as any)) {
      if (typeof keyOrNodeIDOrEventOrCallback === "string") {
        if (typeof callback !== "function") {
          throw new Error("third argument expected to be a callback");
        }

        this.tajEvents.push({
          event: <TajribaEvent>kindOrEvent,
          nodeID: keyOrNodeIDOrEventOrCallback,
          callback,
        });
      } else {
        if (typeof keyOrNodeIDOrEventOrCallback !== "function") {
          throw new Error("second argument expected to be a callback");
        }

        this.tajEvents.push({
          event: <TajribaEvent>kindOrEvent,
          callback: keyOrNodeIDOrEventOrCallback,
        });
      }

      return;
    }

    if (typeof keyOrNodeIDOrEventOrCallback === "function") {
      this.kindEvents.push({
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

      this.attributeEvents.push({
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
  constructor(private subs: SubscriptionCollector) {}

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
}
