import { TajribaAdmin } from "@empirica/tajriba";
import { BehaviorSubject, merge, Subscription } from "rxjs";
import {
  ErrNotConnected,
  TajribaConnection,
} from "../shared/tajriba_connection";
import { bs, bsu } from "../utils/object";

export class AdminConnection {
  private _tajriba = bsu<TajribaAdmin>();
  private _connected = bs(false);
  private _connecting = bs(false);
  private _stopped = bs(false);
  private sub: Subscription;

  constructor(
    taj: TajribaConnection,
    tokens: BehaviorSubject<string | null | undefined>,
    private resetToken: () => void
  ) {
    let token: string | null | undefined;
    let connected = false;
    this.sub = merge(taj.connected, tokens).subscribe({
      next: async (tokenOrConnected) => {
        if (typeof tokenOrConnected === "boolean") {
          connected = tokenOrConnected;
        } else {
          token = tokenOrConnected;
        }

        if (!token || !connected) {
          return;
        }

        if (this._connected.getValue()) {
          return;
        }

        this._connecting.next(true);

        try {
          const tajAdmin = await taj.sessionAdmin(token);

          this._tajriba.next(tajAdmin);
          this._connected.next(true);

          tajAdmin.on(
            "connected",
            this._connected.next.bind(this._connected, true)
          );
          tajAdmin.on(
            "disconnected",
            this._connected.next.bind(this._connected, false)
          );
          tajAdmin.on("accessDenied", () => {
            if (this._connected.getValue()) {
              this._connected.next(false);
            }
            this.resetToken();
          });
        } catch (error) {
          if (error !== ErrNotConnected) {
            this.resetToken();
          }
        }

        this._connecting.next(false);
      },
    });
  }

  stop() {
    if (this._stopped.getValue()) {
      return;
    }

    const taj = this._tajriba.getValue();
    if (taj) {
      taj.removeAllListeners("connected");
      taj.removeAllListeners("disconnected");
      taj.stop();
      this._tajriba.next(undefined);
    }

    this.sub.unsubscribe();

    this._connecting.next(false);
    this._connected.next(false);
    this._stopped.next(true);
  }

  get connecting() {
    return this._connecting;
  }

  get connected() {
    return this._connected;
  }

  get stopped() {
    return this._stopped;
  }

  get admin() {
    return this._tajriba;
  }
}
