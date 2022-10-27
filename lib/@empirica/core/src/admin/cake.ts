import { Observable } from "rxjs";
import { Attribute } from "../shared/attributes";
import { ScopeConstructor } from "../shared/scopes";
import { debug, error, warn } from "../utils/console";
import { AttributeMsg } from "./attributes";
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
import { subscribeAsync } from "./observables";
import { Connection, ConnectionMsg } from "./participants";
import { promiseHandle, PromiseHandle } from "./promises";
import { Scope, ScopeMsg } from "./scopes";
import { Transition } from "./transitions";

// Cake triggers callbacks, respecting listener placement

interface unsuber {
  unsubscribe(): void;
}

export class Cake<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  postCallback: (() => Promise<void>) | undefined;
  private stopped = false;
  private unsubs: unsuber[] = [];

  constructor(
    private evtctx: EventContext<Context, Kinds>,
    private scope: (id: string) => Scope<Context, Kinds> | undefined,
    private kindSubscription: (
      kind: keyof Kinds
    ) => Observable<ScopeMsg<Context, Kinds>>,
    private attributeSubscription: (
      kind: keyof Kinds,
      key: string
    ) => Observable<AttributeMsg>,
    private connections: Observable<ConnectionMsg>,
    private transitions: Observable<Transition>
  ) {}

  async stop() {
    this.stopped = true;
    for (const unsub of this.unsubs) {
      unsub.unsubscribe();
    }
  }

  async add(listeners: ListenersCollector<Context, Kinds>) {
    for (const start of listeners.starts) {
      debug("start callback");
      try {
        await start.callback(this.evtctx);
      } catch (err) {
        prettyPrintError("start", err as Error);
      }

      if (this.postCallback) {
        await this.postCallback();
      }
    }

    if (listeners.kindListeners.length > 0) {
      const kindListeners = new Map<
        keyof Kinds,
        KindEventListener<EvtCtxCallback<Context, Kinds>>[]
      >();

      for (const listener of listeners.kindListeners) {
        const callbacks = kindListeners.get(listener.kind) || [];
        callbacks.push(listener);
        callbacks.sort(comparePlacement);
        kindListeners.set(listener.kind, callbacks);
      }

      for (const [kind, listeners] of kindListeners) {
        let kl = this.kindListeners.get(kind) || [];
        if (this.kindListeners.has(kind)) {
          const until = this.kindLast.get(kind);
          if (until) {
            await this.startKind(kind, () => listeners, until);
          }
          kl.push(...listeners);
          kl.sort(comparePlacement);
          this.kindListeners.set(kind, kl);
        } else {
          this.kindListeners.set(kind, listeners);
          await this.startKind(kind, () => this.kindListeners.get(kind) || []);
        }
      }
    }

    if (listeners.attributeListeners.length > 0) {
      const attributeListeners = new Map<
        string,
        AttributeEventListener<EvtCtxCallback<Context, Kinds>>[]
      >();

      for (const listener of listeners.attributeListeners) {
        const key = listener.kind + "-" + listener.key;
        const callbacks = attributeListeners.get(key) || [];
        callbacks.push(listener);
        callbacks.sort(comparePlacement);
        attributeListeners.set(key, callbacks);
      }

      for (const [kkey, listeners] of attributeListeners) {
        const kind = listeners[0]!.kind;
        const key = listeners[0]!.key;
        let kl = this.attributeListeners.get(kkey) || [];
        if (this.attributeListeners.has(kkey)) {
          const until = this.attributeLast.get(kkey);
          if (until) {
            await this.startAttribute(kind, key, () => listeners, until);
          }
          kl.push(...listeners);
          kl.sort(comparePlacement);
          this.attributeListeners.set(kkey, kl);
        } else {
          this.attributeListeners.set(kkey, listeners);
          await this.startAttribute(
            kind,
            key,
            () => this.attributeListeners.get(kkey) || []
          );
        }
      }
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

          for (const [_, conn] of this.connectionsMap) {
            try {
              await listener.callback(this.evtctx, {
                participant: conn.participant,
              });
            } catch (err) {
              prettyPrintError("participant connect", err as Error);
            }

            if (this.postCallback) {
              await this.postCallback();
            }
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

    for (const ready of listeners.readys) {
      debug("ready callback");
      try {
        await ready.callback(this.evtctx);
      } catch (err) {
        prettyPrintError("ready", err as Error);
      }
    }
  }

  kindListeners = new Map<
    keyof Kinds,
    KindEventListener<EvtCtxCallback<Context, Kinds>>[]
  >();
  kindLast = new Map<keyof Kinds, Scope<Context, Kinds>>();
  async startKind(
    kind: keyof Kinds,
    callbacks: () => KindEventListener<EvtCtxCallback<Context, Kinds>>[],
    until?: Scope<Context, Kinds>
  ) {
    let handle: PromiseHandle | undefined = promiseHandle();
    const unsub = subscribeAsync(
      this.kindSubscription(kind),
      async ({ scope, done }) => {
        if (this.stopped) {
          if (handle) {
            handle.result();
          }

          return;
        }

        if (scope) {
          for (const callback of callbacks()) {
            debug("scope callback", kind);

            try {
              await callback.callback(this.evtctx, { [kind]: scope });
            } catch (err) {
              prettyPrintError(kind as string, err as Error);
            }
            if (this.postCallback) {
              await this.postCallback();
            }
          }

          if (until) {
            if (scope === until) {
              if (handle) {
                handle.result();
                handle = undefined;
              } else {
                warn(`until kind without handle`);
              }
            }
          } else {
            this.kindLast.set(kind, scope);
          }
        }

        if (!until && done && handle) {
          handle.result();
          handle = undefined;
        }
      }
    );

    if (handle) {
      await handle.promise;
    }

    if (until) {
      unsub.unsubscribe();
    } else {
      this.unsubs.push(unsub);
    }
  }

  attributeListeners = new Map<
    string,
    AttributeEventListener<EvtCtxCallback<Context, Kinds>>[]
  >();
  attributeLast = new Map<string, Attribute>();
  async startAttribute(
    kind: keyof Kinds,
    key: string,
    callbacks: () => AttributeEventListener<EvtCtxCallback<Context, Kinds>>[],
    until?: Attribute
  ) {
    let handle: PromiseHandle | undefined = promiseHandle();
    const unsub = this.attributeSubscription(kind, key).subscribe(
      async ({ attribute, done }) => {
        if (this.stopped) {
          if (handle) {
            handle.result();
          }

          return;
        }

        if (attribute) {
          const k = <string>kind + "-" + key;

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

          for (const callback of callbacks()) {
            try {
              await callback.callback(this.evtctx, props);
            } catch (err) {
              prettyPrintError(`${kind as string}.${key}`, err as Error);
            }

            if (this.stopped) {
              return;
            }

            if (this.postCallback) {
              await this.postCallback();
            }

            if (this.stopped) {
              return;
            }
          }

          if (until) {
            if (attribute === until) {
              if (handle) {
                handle.result();
                handle = undefined;
              } else {
                warn(`until attribute without handle`);
              }
            }
          } else {
            this.attributeLast.set(k, attribute);
          }
        }

        if (!until && done && handle) {
          handle.result();
          handle = undefined;
        }
      }
    );

    if (handle) {
      await handle.promise;
    }

    if (until) {
      unsub.unsubscribe();
    } else {
      this.unsubs.push(unsub);
    }
  }

  transitionEvents: TajEventListener<EvtCtxCallback<Context, Kinds>>[] = [];
  startTransitionAdd() {
    const unsub = subscribeAsync(this.transitions, async (transition) => {
      for (const callback of this.transitionEvents) {
        if (this.stopped) {
          return;
        }

        debug(
          `transition callback from '${transition.from}' to '${transition.to}'`
        );

        try {
          await callback.callback(this.evtctx, {
            transition,
            step: transition.step,
          });
        } catch (err) {
          prettyPrintError("transition", err as Error);
        }

        if (this.postCallback) {
          await this.postCallback();
        }
      }
    });

    this.unsubs.push(unsub);
  }

  connectedEvents: TajEventListener<EvtCtxCallback<Context, Kinds>>[] = [];
  connectionsMap = new Map<string, Connection>();
  async startConnected() {
    let handle: PromiseHandle | undefined = promiseHandle();
    const unsub = subscribeAsync(
      this.connections,
      async ({ connection, done }) => {
        if (this.stopped) {
          if (handle) {
            handle.result();
          }

          return;
        }

        if (connection) {
          if (!connection.connected) {
            return;
          }

          this.connectionsMap.set(connection.participant.id, connection);

          for (const callback of this.connectedEvents) {
            debug(`connected callback`);

            try {
              await callback.callback(this.evtctx, {
                participant: connection.participant,
              });
            } catch (err) {
              prettyPrintError("participant connect", err as Error);
            }

            if (this.postCallback) {
              await this.postCallback();
            }
          }
        }

        if (done && handle) {
          handle.result();
          handle = undefined;
        }
      }
    );

    if (handle) {
      await handle.promise;
    }

    this.unsubs.push(unsub);
  }

  disconnectedEvents: TajEventListener<EvtCtxCallback<Context, Kinds>>[] = [];
  startDisconnected() {
    const unsub = subscribeAsync(this.connections, async ({ connection }) => {
      if (this.stopped) {
        return;
      }

      if (!connection || connection.connected) {
        return;
      }

      this.connectionsMap.delete(connection.participant.id);

      for (const callback of this.disconnectedEvents) {
        debug(`disconnected callback`);

        try {
          await callback.callback(this.evtctx, {
            participant: connection.participant,
          });
        } catch (err) {
          prettyPrintError("participant disconnect", err as Error);
        }

        if (this.postCallback) {
          await this.postCallback();
        }
      }
    });

    this.unsubs.push(unsub);
  }
}

type HasPlacement = { placement: ListernerPlacement };
const comparePlacement = (a: HasPlacement, b: HasPlacement) =>
  a.placement - b.placement;

function prettyPrintError(location: string, err: Error) {
  error(`Error caught in "${location}" callback:`);
  error(err);
}
