import {
  AddGroupInput,
  AddScopeInput,
  AddStepInput,
  LinkInput,
  State,
  TransitionInput,
} from "@empirica/tajriba";
import { merge, Subject, SubscriptionLike } from "rxjs";
import { ScopeConstructor } from "../shared/scopes";
import { TajribaConnection } from "../shared/tajriba_connection";
import { error, warn } from "../utils/console";
import { AdminConnection } from "./connection";
import { ListenersCollector, Subscriber } from "./events";
import { Globals } from "./globals";
import { subscribeAsync } from "./observables";
import { Runloop } from "./runloop";
import {
  FileTokenStorage,
  MemTokenStorage,
  SavedTokenStorage,
  TokenProvider,
} from "./token_file";

export class AdminContext<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  readonly tajriba: TajribaConnection;
  public adminConn: AdminConnection | undefined;
  private sub?: SubscriptionLike;
  private runloop: Runloop<Context, Kinds> | undefined;
  private adminSubs = new Subject<
    Subscriber<Context, Kinds> | ListenersCollector<Context, Kinds>
  >();
  private adminStop = new Subject<void>();
  private subs: (
    | Subscriber<Context, Kinds>
    | ListenersCollector<Context, Kinds>
  )[] = [];

  private constructor(url: string, private ctx: Context, private kinds: Kinds) {
    this.tajriba = new TajribaConnection(url);
  }

  /**
   * @internal
   *
   * NOTE: For testing purposes only.
   */
  get _runloop() {
    return this.runloop;
  }

  static async init<
    Context,
    Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
  >(
    url: string,
    tokenFile: string,
    serviceName: string,
    serviceRegistrationToken: string,
    ctx: Context,
    kinds: Kinds
  ) {
    const adminContext = new this(url, ctx, kinds);
    const reset = new Subject<void>();
    let strg: SavedTokenStorage;
    if (tokenFile === ":mem:") {
      strg = new MemTokenStorage();
    } else {
      strg = await FileTokenStorage.init(tokenFile, reset);
    }

    const tp = new TokenProvider(
      adminContext.tajriba,
      strg,
      serviceName,
      serviceRegistrationToken
    );
    adminContext.adminConn = new AdminConnection(
      adminContext.tajriba,
      tp.tokens,
      reset.next.bind(reset)
    );

    adminContext.sub = subscribeAsync(
      merge(adminContext.tajriba.connected, adminContext.adminConn.connected),
      async () => {
        await adminContext.initOrStop();
      }
    );

    return adminContext;
  }

  async stop() {
    this.sub?.unsubscribe();
    delete this.sub;
    await this.stopSubs();
    this.tajriba.stop();
    this.adminConn?.stop();
  }

  register(
    subscriber: Subscriber<Context, Kinds> | ListenersCollector<Context, Kinds>
  ) {
    this.subs.push(subscriber);
    if (this.runloop) {
      this.adminSubs.next(subscriber);
    }
  }

  private async initOrStop() {
    // Forcing this.adminConn since adminConn is always created by init().
    if (
      this.tajriba.connected.getValue() &&
      this.adminConn!.connected.getValue()
    ) {
      await this.initSubs();
    } else {
      await this.stopSubs();
    }
  }

  private async initSubs() {
    if (this.runloop) {
      return;
    }

    /* c8 ignore next 5 */
    if (!this.adminConn) {
      // This condition is nearly impossible to create
      warn("context: admin not connected");
      return;
    }

    /* c8 ignore next 6 */
    const tajAdmin = this.adminConn.admin.getValue();
    if (!tajAdmin) {
      // This condition is nearly impossible to create
      warn("context: admin not connected");
      return;
    }

    let globalScopeID: string | undefined;
    try {
      const scopes = await tajAdmin.scopes({
        filter: { kinds: ["global"] },
        first: 100,
      });
      globalScopeID = scopes!.edges[0]?.node.id;
      if (!globalScopeID) {
        warn("context: global scopeID not found");

        return;
      }
    } catch (err) {
      error(`context: global scopeID not fetched: ${err}`);

      return;
    }

    this.runloop = new Runloop(
      this.adminConn,
      this.ctx,
      this.kinds,
      globalScopeID,
      this.adminSubs,
      this.adminStop
    );

    for (const sub of this.subs) {
      this.adminSubs.next(sub);
    }
  }

  private async stopSubs() {
    this.adminStop.next();
    if (this.runloop) {
      await this.runloop.stop();
      this.runloop = undefined;
    }
  }
}

export interface StepPayload {
  id: string;
  duration: number;
}

export interface AddLinkPayload {
  nodes: { id: string }[];
  participants: { id: string }[];
}

export interface AddTransitionPayload {
  id: string;
  from: State;
  to: State;
}

export interface AddScopePayload {
  id: string;
  name?: string | null | undefined;
  kind?: string | null | undefined;
  attributes: {
    edges: {
      node: {
        id: string;
        private: boolean;
        protected: boolean;
        immutable: boolean;
        ephemeral: boolean;
        key: string;
        val?: string | null | undefined;
        index?: number | null | undefined;
      };
    }[];
  };
}

export type Finalizer = () => Promise<void>;

export class TajribaAdminAccess {
  constructor(
    readonly addFinalizer: (cb: Finalizer) => void,
    readonly addScopes: (input: AddScopeInput[]) => Promise<AddScopePayload[]>,
    readonly addGroups: (input: AddGroupInput[]) => Promise<{ id: string }[]>,
    readonly addLinks: (input: LinkInput[]) => Promise<AddLinkPayload[]>,
    readonly addSteps: (input: AddStepInput[]) => Promise<StepPayload[]>,
    readonly addTransitions: (
      input: TransitionInput[]
    ) => Promise<AddTransitionPayload[]>,
    readonly globals: Globals
  ) {}
}
