import { Observable } from "rxjs";
import { Attribute } from "../shared/attributes";
import { ScopeConstructor } from "../shared/scopes";
import { debug, error } from "../utils/console";
import {
  AttributeEventListener,
  EventContext,
  EvtCtxCallback,
  KindEventListener,
  ListenersCollector,
  ListernerPlacement,
  TajEventListener,
  TajribaEvent,
} from "./events";
import { Connection } from "./participants";
import { Scope } from "./scopes";
import { Transition } from "./transitions";

// Cake triggers callbacks, respecting listener placement

export class Cake<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  postCallback: (() => Promise<void>) | undefined;

  constructor(
    private evtctx: EventContext<Context, Kinds>,
    private scope: (id: string) => Scope<Context, Kinds> | undefined,
    private kindSubscription: (
      kind: keyof Kinds
    ) => Observable<Scope<Context, Kinds>>,
    private attributeSubscription: (
      kind: keyof Kinds,
      key: string
    ) => Observable<Attribute>,
    private connections: Observable<Connection>,
    private transitions: Observable<Transition>
  ) {}

  add(listeners: ListenersCollector<Context, Kinds>) {
    for (const listener of listeners.kindListeners) {
      if (!this.kindListeners.has(listener.kind)) {
        this.startKind(listener.kind);
      }

      const callbacks = this.kindListeners.get(listener.kind) || [];
      callbacks.push(listener);

      callbacks.sort(comparePlacement);

      this.kindListeners.set(listener.kind, callbacks);
    }

    for (const listener of listeners.attributeListeners) {
      const key = listener.kind + "-" + listener.key;
      if (!this.attributeListeners.has(key)) {
        this.startAttribute(listener.kind, listener.key);
      }

      const callbacks = this.attributeListeners.get(key) || [];
      callbacks.push(listener);

      callbacks.sort(comparePlacement);

      this.attributeListeners.set(key, callbacks);
    }

    for (const listener of listeners.tajEvents) {
      switch (listener.event) {
        case TajribaEvent.TransitionAdd: {
          if (this.transitionEvents.length == 0) {
            this.startTransitionAdd();
          }

          this.transitionEvents.push(listener);
          this.transitionEvents.sort(comparePlacement);

          break;
        }
        case TajribaEvent.ParticipantConnect: {
          if (this.connectedEvents.length == 0) {
            this.startConnected();
          }

          this.connectedEvents.push(listener);
          this.connectedEvents.sort(comparePlacement);

          break;
        }
        case TajribaEvent.ParticipantDisconnect: {
          if (this.disconnectedEvents.length == 0) {
            this.startDisconnected();
          }

          this.disconnectedEvents.push(listener);
          this.disconnectedEvents.sort(comparePlacement);

          break;
        }
        // This is difficult to simulate
        /* c8 ignore next 3 */
        default: {
          error(`unsupported tajriba event listener: ${listener.event}`);
        }
      }
    }
  }

  kindListeners = new Map<
    keyof Kinds,
    KindEventListener<EvtCtxCallback<Context, Kinds>>[]
  >();
  startKind(kind: keyof Kinds) {
    this.kindSubscription(kind).subscribe({
      next: async (scope) => {
        // ignore the || [] since it's difficult to simulate
        /* c8 ignore next */
        const callbacks = this.kindListeners.get(kind) || [];

        for (const callback of callbacks) {
          debug("scope callback", kind);
          await callback.callback(this.evtctx, { [kind]: scope });
          if (this.postCallback) {
            await this.postCallback();
          }
        }
      },
    });
  }

  attributeListeners = new Map<
    string,
    AttributeEventListener<EvtCtxCallback<Context, Kinds>>[]
  >();
  startAttribute(kind: keyof Kinds, key: string) {
    this.attributeSubscription(kind, key).subscribe({
      next: async (attribute) => {
        const k = <string>kind + "-" + key;

        // ignore the || [] since it's difficult to simulate
        /* c8 ignore next */
        const callbacks = this.attributeListeners.get(k) || [];

        const props: { [key: string]: any } = {
          [key]: attribute.value,
          attribute,
        };

        if (attribute.nodeID) {
          const scope = this.scope(attribute.nodeID);
          if (scope) {
            props[<string>kind] = scope;
          }
        }

        for (const callback of callbacks) {
          debug("attribute callback", kind, key);
          await callback.callback(this.evtctx, props);
          if (this.postCallback) {
            await this.postCallback();
          }
        }
      },
    });
  }

  transitionEvents: TajEventListener<EvtCtxCallback<Context, Kinds>>[] = [];
  startTransitionAdd() {
    this.transitions.subscribe({
      next: async (transition) => {
        for (const callback of this.transitionEvents) {
          debug(
            `transition callback from '${transition.from}' to '${transition.to}'`
          );
          await callback.callback(this.evtctx, {
            transition,
            step: transition.step,
          });
          if (this.postCallback) {
            await this.postCallback();
          }
        }
      },
    });
  }

  connectedEvents: TajEventListener<EvtCtxCallback<Context, Kinds>>[] = [];
  startConnected() {
    this.connections.subscribe({
      next: async (connection) => {
        if (!connection.connected) {
          return;
        }

        for (const callback of this.connectedEvents) {
          debug(`connected callback`);
          await callback.callback(this.evtctx, {
            participant: connection.participant,
          });
          if (this.postCallback) {
            await this.postCallback();
          }
        }
      },
    });
  }

  disconnectedEvents: TajEventListener<EvtCtxCallback<Context, Kinds>>[] = [];
  startDisconnected() {
    this.connections.subscribe({
      next: async (connection) => {
        if (connection.connected) {
          return;
        }

        for (const callback of this.disconnectedEvents) {
          debug(`disconnected callback`);
          await callback.callback(this.evtctx, {
            participant: connection.participant,
          });
          if (this.postCallback) {
            await this.postCallback();
          }
        }
      },
    });
  }
}
type HasPlacement = { placement: ListernerPlacement };
const comparePlacement = (a: HasPlacement, b: HasPlacement) =>
  a.placement - b.placement;
