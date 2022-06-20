import { Observable } from "rxjs";
import { Attribute } from "../shared/attributes";
import { Scope, ScopeConstructor } from "../shared/scopes";
import { error } from "../utils/console";
import { EventContext, ListenersCollector, TajribaEvent } from "./events";
import { Connection, Participant } from "./participants";
import { Transition } from "./transitions";

export class Layer<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  listeners = new ListenersCollector<Context, Kinds>();
  postCallback: (() => Promise<void>) | undefined;

  constructor(
    private evtctx: EventContext<Context, Kinds>,
    private scope: (id: string) => Scope<Context, Kinds> | undefined,
    private scopesByKind: (
      kind: keyof Kinds
    ) => Map<string, Scope<Context, Kinds>>,
    private attribute: (scopeID: string, key: string) => Attribute | undefined,
    private kindSubscription: (
      kind: keyof Kinds
    ) => Observable<Scope<Context, Kinds>>,
    private attributeSubscription: (
      kind: string,
      key: string
    ) => Observable<Attribute>,
    private participants: Map<string, Participant>,
    private connections: Observable<Connection>,
    private transitions: Observable<Transition>
  ) {}

  async start() {
    for (const kindEvent of this.listeners.kindEvents) {
      this.kindSubscription(kindEvent.kind).subscribe({
        next: async (scope) => {
          kindEvent.callback(this.evtctx, { [kindEvent.kind]: scope });
          if (this.postCallback) {
            await this.postCallback();
          }
        },
      });
    }

    for (const attributeEvent of this.listeners.attributeEvents) {
      this.attributeSubscription(
        attributeEvent.kind,
        attributeEvent.key
      ).subscribe({
        next: async (attribute) => {
          const props: { [key: string]: any } = {
            [attributeEvent.key]: attribute.value,
            attribute,
          };

          if (attribute.nodeID) {
            const scope = this.scope(attribute.nodeID);
            if (scope) {
              props[attributeEvent.kind] = scope;
            }
          }

          attributeEvent.callback(this.evtctx, props);
          if (this.postCallback) {
            await this.postCallback();
          }
        },
      });
    }

    for (const tajEvent of this.listeners.tajEvents) {
      switch (tajEvent.event) {
        case TajribaEvent.TransitionAdd: {
          this.transitions.subscribe({
            next: async (transition) => {
              tajEvent.callback(this.evtctx, {
                transition,
                step: transition.step,
              });
              if (this.postCallback) {
                await this.postCallback();
              }
            },
          });
          break;
        }
        case TajribaEvent.ParticipantConnect: {
          this.connections.subscribe({
            next: async (connection) => {
              if (!connection.connected) {
                return;
              }

              tajEvent.callback(this.evtctx, {
                participant: connection.participant,
              });
              if (this.postCallback) {
                await this.postCallback();
              }
            },
          });
          break;
        }
        case TajribaEvent.ParticipantDisconnect: {
          this.connections.subscribe({
            next: async (connection) => {
              if (connection.connected) {
                return;
              }

              tajEvent.callback(this.evtctx, {
                participant: connection.participant,
              });
              if (this.postCallback) {
                await this.postCallback();
              }
            },
          });
          break;
        }
        default: {
          error(`unsupported tajriba event listener: ${tajEvent.event}`);
        }
      }
    }

    for (const start of this.listeners.starts) {
      await start(this.evtctx);
    }

    for (const kindEvent of this.listeners.kindEvents) {
      for (const [_, scope] of this.scopesByKind(kindEvent.kind)) {
        kindEvent.callback(this.evtctx, { [kindEvent.kind]: scope });
        if (this.postCallback) {
          await this.postCallback();
        }
      }
    }

    for (const attributeEvent of this.listeners.attributeEvents) {
      for (const [scopeID, scope] of this.scopesByKind(attributeEvent.kind)) {
        const attrib = this.attribute(scopeID, attributeEvent.key);
        if (!attrib) {
          continue;
        }
        attributeEvent.callback(this.evtctx, {
          [attributeEvent.key]: attrib.value,
          attribute: attrib,
          [attributeEvent.kind]: scope,
        });
        if (this.postCallback) {
          await this.postCallback();
        }
      }
    }

    for (const tajEvent of this.listeners.tajEvents) {
      switch (tajEvent.event) {
        case TajribaEvent.TransitionAdd: {
          // TODO Figure out how to replay past transitions ¯\_(ツ)_/¯
          break;
        }
        case TajribaEvent.ParticipantConnect: {
          for (const [_, participant] of this.participants) {
            tajEvent.callback(this.evtctx, {
              participant,
            });
            if (this.postCallback) {
              await this.postCallback();
            }
          }
          break;
        }
        case TajribaEvent.ParticipantDisconnect: {
          // noop
          break;
        }
        default: {
          error(`unsupported tajriba event listener: ${tajEvent.event}`);
        }
      }
    }
  }
}
