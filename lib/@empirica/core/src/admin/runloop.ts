import { ScopedAttributesInput } from "@empirica/tajriba";
import { Observable, Subject, Subscription } from "rxjs";
import { AttributeChange, AttributeUpdate } from "../shared/attributes";
import { ScopeConstructor, ScopeIdent, ScopeUpdate } from "../shared/scopes";
import { error } from "../utils/console";
import { Attributes } from "./attributes";
import { AdminConnection } from "./connection";
import { EventContext, Subscriber } from "./events";
import { Layer } from "./layers";
import { Connection, Participant, participantsSub } from "./participants";
import { Scopes } from "./scopes";
import { Subs, Subscriptions } from "./subscriptions";
import { Transition, transitionsSub } from "./transitions";

export class Runloop<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  private layers: Layer<Context, Kinds>[] = [];
  private subs = new Subscriptions<Context, Kinds>();
  private evtctx: EventContext<Context, Kinds>;
  private participants = new Map<string, Participant>();
  private connections = new Subject<Connection>();
  private transitions = new Subject<Transition>();
  private scopesSub = new Subject<ScopeUpdate>();
  private attributesSub = new Subject<AttributeUpdate>();
  private donesSub = new Subject<void>();
  private attributes = new Attributes(
    this.attributesSub,
    this.donesSub,
    this.taj.setAttributes.bind(this.taj)
  );
  private scopes = new Scopes<Context, Kinds>(
    this.scopesSub,
    this.donesSub,
    this.ctx,
    this.kinds,
    this.attributes
  );

  constructor(
    private conn: AdminConnection,
    private ctx: Context,
    private kinds: Kinds,
    subs: Observable<Subscriber<Context, Kinds>>,
    stop: Observable<void>
  ) {
    this.evtctx = new EventContext(this.subs);
    const subsSub = subs.subscribe({
      next: async (subscriber) => {
        const layer = new Layer(
          this.evtctx,
          this.scopes.scope.bind(this.scopes),
          this.scopes.byKind.bind(this.scopes),
          this.attributes.attributePeek.bind(this.scopes),
          this.scopes.subscribeKind.bind(this.scopes),
          this.attributes.subscribeAttribute.bind(this.attributes),
          this.participants,
          this.connections,
          this.transitions
        );
        this.layers.push(layer);
        subscriber(layer.listeners);
        await this.initLayer(layer);
      },
    });

    let stopSub: Subscription;
    stopSub = stop.subscribe({
      next: () => {
        subsSub.unsubscribe();
        stopSub.unsubscribe();
      },
    });
  }

  private async initLayer(layer: Layer<Context, Kinds>) {
    await layer.start();

    // Keep loading until no more subs
    while (true) {
      const subs = this.subs.newSubs();
      if (!subs) {
        break;
      }
      await this.processNewSub(subs);
    }

    layer.postCallback = async () => {
      const subs = this.subs.newSubs();
      if (subs) {
        await this.processNewSub(subs);
      }
    };
  }

  private async processNewScopesSub(filters: ScopedAttributesInput[]) {
    if (filters.length === 0) {
      return;
    }

    let resolve: (value: unknown) => void;
    const prom = new Promise((r) => (resolve = r));
    this.taj.scopedAttributes(filters).subscribe({
      next: ({ attribute, done }) => {
        if (attribute) {
          if (attribute.node.__typename !== "Scope") {
            error(`scoped attribute with non-scope node`);
            return;
          }

          this.attributesSub.next({
            attribute: attribute as AttributeChange,
            removed: false,
          });

          this.scopesSub.next({
            scope: attribute.node as ScopeIdent,
            removed: false,
          });
        }

        if (done) {
          resolve(null);
          this.donesSub.next();
        }
      },
    });

    await prom;
  }

  private async processNewSub(subs: Subs) {
    const filters: ScopedAttributesInput[] = [];
    if (subs.scopes.ids.length > 0) {
      filters.push({ ids: subs.scopes.ids });
    }

    if (subs.scopes.kinds.length > 0) {
      filters.push({ kinds: subs.scopes.kinds });
    }

    if (subs.participants) {
      participantsSub(this.taj, this.connections, this.participants);
    }

    if (subs.transitions.length > 0) {
      for (const id of subs.transitions) {
        transitionsSub(this.taj, this.transitions, id);
      }
    }

    await this.processNewScopesSub(filters);
  }

  private get taj() {
    return this.conn.admin.getValue()!;
  }
}
