import {
  AddGroupInput,
  AddScopeInput,
  AddStepInput,
  LinkInput,
  TransitionInput,
} from "@empirica/tajriba";
import { Attribute } from "../shared/attributes";
import { ScopeConstructor } from "../shared/scopes";
import { Finalizer, TajribaAdminAccess } from "./context";
import { Scope, Scopes } from "./scopes";
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

const placementString = new Map<ListernerPlacement, string>();
placementString.set(ListernerPlacement.Before, "before");
placementString.set(ListernerPlacement.None, "on");
placementString.set(ListernerPlacement.After, "after");

export function PlacementString(placement: ListernerPlacement): string {
  return placementString.get(placement)!;
}

export type SimpleListener<
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

function unique<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> },
  K extends keyof Kinds
>(
  kind: K,
  placement: ListernerPlacement,
  callback: EvtCtxCallback<Context, Kinds>
) {
  return async (ctx: EventContext<Context, Kinds>, props: any) => {
    const attr = props.attribute as Attribute;
    const scope = props[kind] as Scope<Context, Kinds>;
    if (!attr.id || scope.get(`ran-${attr.id}`)) {
      return;
    }

    await callback(ctx, props);

    // console.log(
    //   `ran-${PlacementString(placement)}-${attr.id}`,
    //   scope.id,
    //   attr.key
    // );
    scope.set(`ran-${PlacementString(placement)}-${attr.id}`, true);
  };
}

// Collects event listeners.
export class ListenersCollector<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  readonly starts: SimpleListener<Context, Kinds>[] = [];
  readonly readys: SimpleListener<Context, Kinds>[] = [];
  readonly tajEvents: TajEventListener<EvtCtxCallback<Context, Kinds>>[] = [];
  readonly kindListeners: KindEventListener<EvtCtxCallback<Context, Kinds>>[] =
    [];
  readonly attributeListeners: AttributeEventListener<
    EvtCtxCallback<Context, Kinds>
  >[] = [];

  get unique() {
    return new ListenersCollectorProxy<Context, Kinds>(this);
  }

  // start: first callback called.
  // ready: callback called when initial loading is finished.
  on(
    kind: "start" | "ready",
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
    callback: EvtCtxCallback<Context, Kinds>,
    uniqueCall?: boolean
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
    callback?: EvtCtxCallback<Context, Kinds>,
    uniqueCall?: boolean
  ): void {
    this.registerListerner(
      ListernerPlacement.Before,
      kindOrEvent,
      keyOrNodeIDOrEventOrCallback,
      callback,
      uniqueCall
    );
  }

  after(
    kindOrEvent: string,
    keyOrNodeIDOrEventOrCallback?:
      | string
      | TajribaEvent
      | EvtCtxCallback<Context, Kinds>
      | ((ctx: EventContext<Context, Kinds>) => void),
    callback?: EvtCtxCallback<Context, Kinds>,
    uniqueCall?: boolean
  ): void {
    this.registerListerner(
      ListernerPlacement.After,
      kindOrEvent,
      keyOrNodeIDOrEventOrCallback,
      callback,
      uniqueCall
    );
  }

  protected registerListerner(
    placement: ListernerPlacement,
    kindOrEvent: string,
    keyOrNodeIDOrEventOrCallback?:
      | string
      | TajribaEvent
      | EvtCtxCallback<Context, Kinds>
      | ((ctx: EventContext<Context, Kinds>) => void),
    callback?: EvtCtxCallback<Context, Kinds>,
    uniqueCall = false
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

    if (kindOrEvent === "ready") {
      if (callback) {
        throw new Error("ready event only accepts 2 arguments");
      }

      if (typeof keyOrNodeIDOrEventOrCallback !== "function") {
        throw new Error("second argument expected to be a callback");
      }

      this.readys.push({
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

      if (uniqueCall) {
        callback = unique(kindOrEvent, placement, callback);
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

// Collects event listeners.
class ListenersCollectorProxy<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> extends ListenersCollector<Context, Kinds> {
  constructor(private coll: ListenersCollector<Context, Kinds>) {
    super();
  }

  protected registerListerner(
    placement: ListernerPlacement,
    kindOrEvent: string,
    keyOrNodeIDOrEventOrCallback?:
      | string
      | TajribaEvent
      | EvtCtxCallback<Context, Kinds>
      | ((ctx: EventContext<Context, Kinds>) => void),
    callback?: EvtCtxCallback<Context, Kinds>
  ): void {
    if (
      kindOrEvent === "start" ||
      kindOrEvent === "ready" ||
      Object.values(TajribaEvent).includes(kindOrEvent as any) ||
      typeof keyOrNodeIDOrEventOrCallback === "function"
    ) {
      throw new Error("only attribute listeners can be unique");
    }

    super.registerListerner(
      placement,
      kindOrEvent,
      keyOrNodeIDOrEventOrCallback,
      callback,
      true
    );

    while (true) {
      const listener = this.attributeListeners.pop();
      if (!listener) {
        break;
      }

      this.coll.attributeListeners.push(listener);
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
    private taj: TajribaAdminAccess,
    private scopes: Scopes<Context, Kinds>
  ) {}

  scopesByKind<T extends Scope<Context, Kinds>>(kind: keyof Kinds) {
    return this.scopes.byKind<T>(kind) as Map<string, T>;
  }

  scopesByKindID<T extends Scope<Context, Kinds>>(
    kind: keyof Kinds,
    id: string
  ) {
    return this.scopes.byKind<T>(kind).get(id);
  }

  scopesByKindMatching<T extends Scope<Context, Kinds>>(
    kind: keyof Kinds,
    key: string,
    val: string
  ): T[] {
    const scopes = Array.from(this.scopes.byKind(kind).values());
    return scopes.filter((s) => s.get(key) === val) as T[];
  }

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
    return this.taj.addScopes(input);
  }

  /* c8 ignore next 3 */
  addGroups(input: AddGroupInput[]) {
    return this.taj.addGroups(input);
  }

  /* c8 ignore next 3 */
  addLinks(input: LinkInput[]) {
    return this.taj.addLinks(input);
  }

  /* c8 ignore next 3 */
  addSteps(input: AddStepInput[]) {
    return this.taj.addSteps(input);
  }

  /* c8 ignore next 3 */
  addTransitions(input: TransitionInput[]) {
    return this.taj.addTransitions(input);
  }

  protected addFinalizer(cb: Finalizer) {
    this.taj.addFinalizer(cb);
  }

  /* c8 ignore next 3 */
  get globals() {
    return this.taj.globals;
  }
}
