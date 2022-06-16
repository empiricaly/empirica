import { ParticipantIdent, Tajriba } from "@empirica/tajriba";
import { bs } from "../utils/object";

export const ErrNotConnected = new Error("not connected");

export class TajribaConnection {
  readonly tajriba: Tajriba;
  private _connected = bs(false);
  private _connecting = bs(true);
  private _stopped = bs(false);

  constructor(private url: string) {
    this.tajriba = Tajriba.connect(this.url);
    this._connected.next(this.tajriba.connected);

    this.tajriba.on("connected", () => {
      this._connected.next(true);
      this._connecting.next(false);
    });

    this.tajriba.on("disconnected", () => {
      this._connected.next(false);
      this._connecting.next(true);
    });
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

  async sessionParticipant(token: string, pident: ParticipantIdent) {
    if (!this._connected.getValue()) {
      throw ErrNotConnected;
    }

    return await this.tajriba.sessionParticipant(token, pident);
  }

  async sessionAdmin(token: string) {
    if (!this._connected.getValue()) {
      throw ErrNotConnected;
    }

    return await this.tajriba.sessionAdmin(token);
  }

  stop() {
    if (this._stopped.getValue()) {
      return;
    }

    if (this.tajriba) {
      this.tajriba.removeAllListeners("connected");
      this.tajriba.removeAllListeners("disconnected");
      this.tajriba.stop();
    }

    this._connecting.next(false);
    this._connected.next(false);
    this._stopped.next(true);
  }
}
