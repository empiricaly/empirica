import { Subject } from "rxjs";
import { ScopeConstructor } from "../shared/scopes";
import { TajribaConnection } from "../shared/tajriba_connection";
import { warn } from "../utils/console";
import { AdminConnection } from "./connection";
import { Subscriber } from "./events";
import { Runloop } from "./runloop";
import { FileTokenStorage, TokenProvider } from "./token_file";

export class AdminContext<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  readonly tajriba: TajribaConnection;
  public adminConn: AdminConnection | undefined;
  private runloop: Runloop<Context, Kinds> | undefined;
  private adminSubs = new Subject<Subscriber<Context, Kinds>>();
  private adminStop = new Subject<void>();
  private subs: Subscriber<Context, Kinds>[] = [];

  private constructor(url: string, private ctx: Context, private kinds: Kinds) {
    this.tajriba = new TajribaConnection(url);
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
    const strg = await FileTokenStorage.init(tokenFile, reset);
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

    adminContext.tajriba.connected.subscribe({
      next: () => {
        adminContext.initOrStop();
      },
    });

    adminContext.adminConn.connected.subscribe({
      next: () => {
        adminContext.initOrStop();
      },
    });
  }

  register(subscriber: Subscriber<Context, Kinds>) {
    this.subs.push(subscriber);
    if (this.runloop) {
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
    if (this.runloop) {
      warn("context: admin already connected");
      return;
    }

    if (!this.adminConn) {
      warn("context: admin not connected");
      return;
    }

    this.runloop = new Runloop(
      this.adminConn,
      this.ctx,
      this.kinds,
      this.adminSubs,
      this.adminStop
    );
    for (const sub of this.subs) {
      this.adminSubs.next(sub);
    }
  }

  private stopSubs() {
    this.adminStop.next();
    this.runloop = undefined;
  }
}
