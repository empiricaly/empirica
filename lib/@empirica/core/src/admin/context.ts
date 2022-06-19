import { Observable, Subject, Subscription } from "rxjs";
import { TajribaConnection } from "../shared/tajriba_connection";
import { warn } from "../utils/console";
import { AdminConnection } from "./connection";
import { EventContext, ListenersCollector, Subscriber } from "./events";
import { ScopeConstructor } from "./scopes";
import { Subscriptions } from "./subscriptions";
import { FileTokenStorage, TokenProvider } from "./token_file";

export class AdminContext<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  readonly tajriba: TajribaConnection;
  public adminConn: AdminConnection | undefined;
  private admin: Admin<Context, Kinds> | undefined;
  private adminSubs = new Subject<Subscriber<Context, Kinds>>();
  private adminStop = new Subject<void>();
  private subs: Subscriber<Context, Kinds>[] = [];

  private constructor(url: string) {
    this.tajriba = new TajribaConnection(url);
  }

  static async init(
    url: string,
    tokenFile: string,
    serviceName: string,
    serviceRegistrationToken: string
  ) {
    const ctx = new this(url);
    const reset = new Subject<void>();
    const strg = await FileTokenStorage.init(tokenFile, reset);
    const tp = new TokenProvider(
      ctx.tajriba,
      strg,
      serviceName,
      serviceRegistrationToken
    );
    ctx.adminConn = new AdminConnection(
      ctx.tajriba,
      tp.tokens,
      reset.next.bind(reset)
    );

    ctx.tajriba.connected.subscribe({
      next: () => {
        ctx.initOrStop();
      },
    });

    ctx.adminConn.connected.subscribe({
      next: () => {
        ctx.initOrStop();
      },
    });
  }

  register(subscriber: Subscriber<Context, Kinds>) {
    this.subs.push(subscriber);
    if (this.admin) {
      this.adminSubs.next(subscriber);
    }
  }

  private initOrStop() {
    if (
      this.tajriba.connected.getValue() &&
      this.adminConn?.connected.getValue()
    ) {
      this.initSubs();
    } else {
      this.stopSubs();
    }
  }

  private initSubs() {
    if (this.admin) {
      warn("context: admin already connected");
      return;
    }

    if (!this.adminConn) {
      warn("context: admin not connected");
      return;
    }

    this.admin = new Admin(this.adminConn, this.adminSubs, this.adminStop);
    for (const sub of this.subs) {
      this.adminSubs.next(sub);
    }
  }

  private stopSubs() {
    this.adminStop.next();
    this.admin = undefined;
  }
}

export class Admin<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  private listeners = new ListenersCollector<Context, Kinds>();
  private subs = new Subscriptions<Context, Kinds>();
  private evtctx: EventContext<Context, Kinds>[] = [];

  constructor(
    private conn: AdminConnection,
    subs: Observable<Subscriber<Context, Kinds>>,
    stop: Observable<void>
  ) {
    const ctx = new EventContext(this.subs);
    this.evtctx.push(ctx);
    const subsSub = subs.subscribe({
      next: (subscriber) => {
        subscriber(this.listeners);
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

  private get taj() {
    return this.conn.admin.getValue();
  }
}
