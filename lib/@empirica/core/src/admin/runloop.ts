import {
  AddGroupInput,
  AddScopeInput,
  AddStepInput,
  LinkInput,
  ScopedAttributesInput,
  SetAttributeInput,
  TransitionInput,
} from "@empirica/tajriba";
import { Observable, Subject, Subscription } from "rxjs";
import { AttributeChange, AttributeUpdate } from "../shared/attributes";
import { ScopeConstructor, ScopeIdent, ScopeUpdate } from "../shared/scopes";
import { error, warn } from "../utils/console";
import { Attributes } from "./attributes";
import { Cake } from "./cake";
import { AdminConnection } from "./connection";
import { TajribaAdminAccess } from "./context";
import { EventContext, Subscriber } from "./events";
import { Globals } from "./globals";
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
  private attributes: Attributes;
  private scopeInputs: AddScopeInput[] = [];
  private addGroupsInputs: AddGroupInput[] = [];
  private addLinksInputs: LinkInput[] = [];
  private addTransitionsInputs: TransitionInput[] = [];
  private attributeInputs: SetAttributeInput[] = [];
  private scopes: Scopes<Context, Kinds>;
  private cake: Cake<Context, Kinds>;

  constructor(
    private conn: AdminConnection,
    private ctx: Context,
    private kinds: Kinds,
    globalScopeID: string,
    subs: Observable<Subscriber<Context, Kinds>>,
    stop: Observable<void>
  ) {
    this.attributes = new Attributes(
      this.attributesSub,
      this.donesSub,
      this.setAttributes.bind(this)
    );

    const mut = new TajribaAdminAccess(
      this.addScopes.bind(this),
      this.addGroups.bind(this),
      this.addLinks.bind(this),
      this.addSteps.bind(this),
      this.addTransitions.bind(this),
      new Globals(
        this.taj.globalAttributes(),
        globalScopeID,
        this.setAttributes.bind(this)
      )
    );

    this.scopes = new Scopes<Context, Kinds>(
      this.scopesSub,
      this.donesSub,
      this.ctx,
      this.kinds,
      this.attributes,
      mut
    );

    this.evtctx = new EventContext(this.subs, mut);
    this.cake = new Cake(
      this.evtctx,
      this.scopes.scope.bind(this.scopes),
      this.scopes.subscribeKind.bind(this.scopes),
      (kind: keyof Kinds, key: string) =>
        this.attributes.subscribeAttribute(<string>kind, key),
      this.connections,
      this.transitions
    );
    this.cake.postCallback = this.postCallback.bind(this);

    const subsSub = subs.subscribe({
      next: async (subscriber) => {
        const layer = new Layer(
          this.evtctx,
          this.scopes.byKind.bind(this.scopes),
          this.attributes.attributePeek.bind(this.scopes),
          this.participants
        );
        this.layers.push(layer);
        subscriber(layer.listeners);
        await this.cake.add(layer.listeners);
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

    layer.postCallback = this.postCallback.bind(this);
  }

  private async postCallback() {
    const promises: Promise<any>[] = [];

    const subs = this.subs.newSubs();
    if (subs) {
      promises.push(this.processNewSub(subs));
    }

    if (this.scopeInputs.length > 0) {
      promises.push(this.taj.addScopes(this.scopeInputs));
      this.scopeInputs = [];
    }

    if (this.addGroupsInputs.length > 0) {
      promises.push(this.taj.addGroups(this.addGroupsInputs));
      this.addGroupsInputs = [];
    }

    if (this.addLinksInputs.length > 0) {
      for (const linkInput of this.addLinksInputs) {
        promises.push(this.taj.addLink(linkInput));
      }
      this.addLinksInputs = [];
    }

    if (this.addTransitionsInputs.length > 0) {
      for (const transition of this.addTransitionsInputs) {
        promises.push(this.taj.transition(transition));
      }
      this.addTransitionsInputs = [];
    }

    if (this.attributeInputs.length > 0) {
      promises.push(this.taj.setAttributes(this.attributeInputs));
      this.attributeInputs = [];
    }

    const res = await Promise.allSettled(promises);
    for (const r of res) {
      if (r.status === "rejected") {
        warn(`failed load: ${r.reason}`);
      }
    }
  }

  async addScopes(inputs: AddScopeInput[]) {
    this.scopeInputs.push(...inputs);
  }

  async addGroups(inputs: AddGroupInput[]) {
    this.addGroupsInputs.push(...inputs);
  }

  async addLinks(inputs: LinkInput[]) {
    this.addLinksInputs.push(...inputs);
  }

  async addSteps(inputs: AddStepInput[]) {
    return this.taj.addSteps(inputs);
  }

  async addTransitions(inputs: TransitionInput[]) {
    this.addTransitionsInputs.push(...inputs);
  }

  async setAttributes(inputs: SetAttributeInput[]) {
    this.attributeInputs.push(...inputs);
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

    if (subs.scopes.names.length > 0) {
      filters.push({ names: subs.scopes.names });
    }

    if (subs.scopes.keys.length > 0) {
      filters.push({ keys: subs.scopes.keys });
    }

    if (subs.scopes.kvs.length > 0) {
      filters.push({ kvs: subs.scopes.kvs });
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
