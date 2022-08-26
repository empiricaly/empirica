import {
  AddGroupInput,
  AddScopeInput,
  AddStepInput,
  LinkInput,
  ScopedAttributesInput,
  SetAttributeInput,
  TransitionInput,
} from "@empirica/tajriba";
import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs";
import { AttributeChange, AttributeUpdate } from "../shared/attributes";
import { ScopeConstructor, ScopeIdent, ScopeUpdate } from "../shared/scopes";
import { error, trace, warn } from "../utils/console";
import { Attributes } from "./attributes";
import { Cake } from "./cake";
import { AdminConnection } from "./connection";
import {
  AddLinkPayload,
  AddScopePayload,
  AddTransitionPayload,
  Finalizer,
  StepPayload,
  TajribaAdminAccess,
} from "./context";
import { EventContext, ListenersCollector, Subscriber } from "./events";
import { Globals } from "./globals";
import { Layer } from "./layers";
import { awaitObsValue } from "./observables";
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
  private finalizers: Finalizer[] = [];
  private groupPromises: Promise<{ id: string }[]>[] = [];
  private stepPromises: Promise<StepPayload[]>[] = [];
  private scopePromises: Promise<AddScopePayload[]>[] = [];
  private linkPromises: Promise<AddLinkPayload>[] = [];
  private transitionPromises: Promise<AddTransitionPayload>[] = [];
  // private addTransitionsInputs: TransitionInput[] = [];
  private attributeInputs: SetAttributeInput[] = [];
  private scopes: Scopes<Context, Kinds>;
  private cake: Cake<Context, Kinds>;
  private running = new BehaviorSubject<boolean>(false);
  private stopped = false;

  constructor(
    private conn: AdminConnection,
    private ctx: Context,
    private kinds: Kinds,
    globalScopeID: string,
    subs: Observable<
      Subscriber<Context, Kinds> | ListenersCollector<Context, Kinds>
    >,
    stop: Observable<void>
  ) {
    this.attributes = new Attributes(
      this.attributesSub,
      this.donesSub,
      this.setAttributes.bind(this)
    );

    const mut = new TajribaAdminAccess(
      this.addFinalizer.bind(this),
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
    this.cake.postCallback = this.postCallback.bind(this, true);

    const subsSub = subs.subscribe({
      next: async (subscriber) => {
        const layer = new Layer(
          this.evtctx,
          this.scopes.byKind.bind(this.scopes),
          this.attributes.attributePeek.bind(this.scopes),
          this.participants
        );
        this.layers.push(layer);

        if (typeof subscriber === "function") {
          subscriber(layer.listeners);
        } else {
          layer.listeners = subscriber;
        }

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

    await layer.ready();

    while (true) {
      const subs = this.subs.newSubs();
      if (!subs) {
        break;
      }
      await this.processNewSub(subs);
    }

    layer.postCallback = this.postCallback.bind(this, true);
  }

  private async postCallback(final: boolean) {
    if (this.stopped) {
      return;
    }

    this.running.next(true);

    const promises: Promise<any>[] = [];

    const subs = this.subs.newSubs();
    if (subs) {
      promises.push(this.processNewSub(subs));
    }

    promises.push(...this.groupPromises);
    this.groupPromises = [];
    promises.push(...this.stepPromises);
    this.stepPromises = [];
    promises.push(...this.scopePromises);
    this.scopePromises = [];
    promises.push(...this.linkPromises);
    this.linkPromises = [];
    promises.push(...this.transitionPromises);
    this.transitionPromises = [];

    if (this.attributeInputs.length > 0) {
      // If the same key is set twice within the same loop, only send 1
      // setAttribute update.
      const uniqueAttrs: { [key: string]: SetAttributeInput } = {};
      for (const attr of this.attributeInputs) {
        if (!attr.nodeID) {
          error(`runloop: attribute without nodeID: ${JSON.stringify(attr)}`);
          continue;
        }

        uniqueAttrs[`${attr.nodeID}-${attr.key}`] = attr;
      }

      const attrs = Object.values(uniqueAttrs);
      trace(`setting attributes: ${JSON.stringify(attrs)}`);

      promises.push(this.taj.setAttributes(attrs));
      this.attributeInputs = [];
    }

    const res = await Promise.allSettled(promises);
    for (const r of res) {
      if (r.status === "rejected") {
        warn(`failed load: ${r.reason}`);
      }
    }

    const finalizer = this.finalizers.shift();
    if (finalizer) {
      await finalizer();
      await this.postCallback(false);
    }

    if (final) {
      this.running.next(false);
    }
  }

  async stop() {
    await this.cake.stop();
    await awaitObsValue(this.running, false);
    this.stopped = true;
  }

  addFinalizer(cb: Finalizer) {
    this.finalizers.push(cb);
  }

  async addScopes(inputs: AddScopeInput[]) {
    const addScopes = this.taj.addScopes(inputs).catch((err) => {
      warn(err.message);
      return [];
    });
    this.scopePromises.push(
      addScopes.then((scopes) => {
        for (const scope of scopes) {
          for (const attrEdge of scope.attributes.edges) {
            this.attributesSub.next({
              attribute: attrEdge.node as AttributeChange,
              removed: false,
            });
          }

          this.scopesSub.next({
            scope: scope as ScopeIdent,
            removed: false,
          });
        }

        this.donesSub.next();

        return scopes;
      })
    );

    return addScopes;
  }

  async addGroups(inputs: AddGroupInput[]) {
    const addGroups = this.taj.addGroups(inputs);
    this.groupPromises.push(addGroups);
    return addGroups;
  }

  async addLinks(inputs: LinkInput[]) {
    const proms: Promise<AddLinkPayload>[] = [];
    for (const input of inputs) {
      const linkPromise = this.taj.addLink(input);
      this.linkPromises.push(linkPromise);
      proms.push(linkPromise);
    }

    return Promise.all(proms);
  }

  async addSteps(inputs: AddStepInput[]) {
    const addSteps = this.taj.addSteps(inputs);
    this.stepPromises.push(addSteps);
    return addSteps;
  }

  async addTransitions(inputs: TransitionInput[]) {
    const proms: Promise<AddTransitionPayload>[] = [];
    for (const input of inputs) {
      const transitionPromise = this.taj.transition(input);
      this.transitionPromises.push(transitionPromise);
      proms.push(transitionPromise);
    }

    return Promise.all(proms);
  }

  async setAttributes(inputs: SetAttributeInput[]) {
    this.attributeInputs.push(...inputs);
  }

  // TODO ADD iteration attributes per scope, only first 100...
  private loadAllScopes(filters: ScopedAttributesInput[], after?: any) {
    this.taj.scopes({ filter: filters, first: 100, after }).then((conn) => {
      const scopes: { [key: string]: ScopeIdent } = {};
      for (const edge of conn?.edges || []) {
        for (const attrEdge of edge.node.attributes.edges || []) {
          this.attributesSub.next({
            attribute: attrEdge.node as AttributeChange,
            removed: false,
          });
        }

        scopes[edge.node.id] = edge.node as ScopeIdent;
      }

      for (const scope of Object.values(scopes)) {
        this.scopesSub.next({
          scope,
          removed: false,
        });
      }

      if (conn?.pageInfo.hasNextPage && conn?.pageInfo.endCursor) {
        return this.loadAllScopes(filters, conn?.pageInfo.endCursor);
      }
    });
  }

  private async processNewScopesSub(filters: ScopedAttributesInput[]) {
    if (filters.length === 0) {
      return;
    }

    const initProm = this.loadAllScopes(filters);

    let resolve: (value: void) => void;
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
          resolve();
          this.donesSub.next();
        }
      },
    });

    await Promise.all([prom, initProm]);
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
