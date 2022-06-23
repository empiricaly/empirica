import { Attribute } from "../shared/attributes";
import { Scope } from "./scopes";
import { ScopeConstructor } from "../shared/scopes";
import { error } from "../utils/console";
import { EventContext, ListenersCollector, TajribaEvent } from "./events";
import { Participant } from "./participants";

export class Layer<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  readonly listeners = new ListenersCollector<Context, Kinds>();
  postCallback: (() => Promise<void>) | undefined;

  constructor(
    private evtctx: EventContext<Context, Kinds>,
    private scopesByKind: (
      kind: keyof Kinds
    ) => Map<string, Scope<Context, Kinds>>,
    private attribute: (scopeID: string, key: string) => Attribute | undefined,
    private participants: Map<string, Participant>
  ) {}

  async start() {
    for (const start of this.listeners.starts) {
      await start.callback(this.evtctx);
    }

    for (const kindEvent of this.listeners.kindListeners) {
      for (const [_, scope] of this.scopesByKind(kindEvent.kind)) {
        await kindEvent.callback(this.evtctx, { [kindEvent.kind]: scope });
        if (this.postCallback) {
          await this.postCallback();
        }
      }
    }

    for (const attributeEvent of this.listeners.attributeListeners) {
      for (const [scopeID, scope] of this.scopesByKind(attributeEvent.kind)) {
        const attrib = this.attribute(scopeID, attributeEvent.key);
        if (!attrib) {
          continue;
        }
        await attributeEvent.callback(this.evtctx, {
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
            await tajEvent.callback(this.evtctx, {
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
        // This is difficult to simulate
        /* c8 ignore next 3 */
        default: {
          error(`unsupported tajriba event listener: ${tajEvent.event}`);
        }
      }
    }
  }
}
