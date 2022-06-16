import { TajribaAdmin } from "@empirica/tajriba";
import { BehaviorSubject, merge } from "rxjs";
import {
  ErrNotConnected,
  TajribaConnection,
} from "../shared/tajriba_connection";

export function bs<T>(init: T) {
  return new BehaviorSubject<T>(init);
}

function bsu<T>(init: T | undefined = undefined) {
  return new BehaviorSubject<T | undefined>(init);
}

export class AdminConnection {
  private _tajriba = bsu<TajribaAdmin>();
  private _connected = bs(false);
  private _connecting = bs(false);
  private _stopped = bs(false);
  private _unsub: () => void;

  constructor(
    taj: TajribaConnection,
    tokens: BehaviorSubject<string | undefined>,
    private resetToken: () => void
  ) {
    let token: string | undefined;
    let connected = false;
    const { unsubscribe } = merge(taj.connected, tokens).subscribe({
      next: async (tokenOrConnected) => {
        if (typeof tokenOrConnected === "boolean") {
          connected = tokenOrConnected;
        } else {
          token = tokenOrConnected;
        }

        if (!token || !connected) {
          if (this._connected.getValue()) {
          }

          return;
        }

        if (this._connected.getValue()) {
          return;
        }

        this._connecting.next(true);

        try {
          const tajUser = await taj.sessionAdmin(token);

          this._tajriba.next(tajUser);
          this._connected.next(true);

          tajUser.on(
            "connected",
            this._connected.next.bind(this._connected, true)
          );
          tajUser.on(
            "disconnected",
            this._connected.next.bind(this._connected, false)
          );
        } catch (error) {
          if (error !== ErrNotConnected) {
            this.resetToken();
          }
        }

        this._connecting.next(false);
      },
    });

    this._unsub = unsubscribe;
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

    this._unsub();

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

  get participant() {
    return this._tajriba;
  }
}
