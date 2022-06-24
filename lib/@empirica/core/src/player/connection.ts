import { ParticipantIdent, TajribaParticipant } from "@empirica/tajriba";
import { BehaviorSubject, merge, Observable } from "rxjs";
import {
  ErrNotConnected,
  TajribaConnection,
} from "../shared/tajriba_connection";
import { bs, bsu } from "../utils/object";

export class ParticipantConnection {
  private _tajribaPart = bsu<TajribaParticipant>();
  private _connected = bs(false);
  private _connecting = bs(false);
  private _stopped = bs(false);
  private _sessionsUnsub: () => void;

  constructor(
    taj: TajribaConnection,
    sessions: BehaviorSubject<Session | undefined>,
    private resetSession: () => void
  ) {
    let session: Session | undefined;
    let connected = false;
    const { unsubscribe } = merge(taj.connected, sessions).subscribe({
      next: async (sessionOrConnected) => {
        if (typeof sessionOrConnected === "boolean") {
          connected = sessionOrConnected;
        } else {
          session = sessionOrConnected;
        }

        if (!session || !connected) {
          return;
        }

        if (this._connected.getValue()) {
          return;
        }

        this._connecting.next(true);

        try {
          const tajPart = await taj.sessionParticipant(
            session.token,
            session.participant
          );

          this._tajribaPart.next(tajPart);
          this._connected.next(true);

          tajPart.on(
            "connected",
            this._connected.next.bind(this._connected, true)
          );
          tajPart.on(
            "disconnected",
            this._connected.next.bind(this._connected, false)
          );
          tajPart.on("error", (error) => {
            console.log("conn error", error);
          });
          tajPart.on("accessDenied", () => {
            this.resetSession();
          });
        } catch (error) {
          console.log("ERROR HERE", error);
          if (error !== ErrNotConnected) {
            this.resetSession();
          }
        }

        this._connecting.next(false);
      },
    });

    this._sessionsUnsub = unsubscribe;
  }

  stop() {
    if (this._stopped.getValue()) {
      return;
    }

    const taj = this._tajribaPart.getValue();
    if (taj) {
      taj.removeAllListeners("connected");
      taj.removeAllListeners("disconnected");
      taj.stop();
      this._tajribaPart.next(undefined);
    }

    this._sessionsUnsub();

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
    return this._tajribaPart;
  }
}

export interface Session {
  token: string;
  participant: ParticipantIdent;
}

interface Storage {
  clear(): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const isBrowser =
  typeof window !== "undefined" && typeof window.document !== "undefined";

let storage: Storage;
if (isBrowser) {
  storage = window.localStorage;
}

export class ParticipantSession {
  static tokenKey = "empirica:token";
  static partKey = "empirica:participant";
  static storage: Storage = storage;

  private _sessions: BehaviorSubject<Session | undefined>;
  private _token?: string;
  protected _participant?: ParticipantIdent;

  constructor(private ns: string, resetSession: Observable<void>) {
    this._token = this.strg.getItem(this.tokenKey) || undefined;

    const participantStr = this.strg.getItem(this.partKey) || undefined;

    if (participantStr) {
      this._participant = JSON.parse(participantStr);
    }

    const sess = this.calcSession();
    this._sessions = bsu<Session>(sess);

    resetSession.subscribe({
      next: () => {
        this.clearSession();
      },
    });
  }

  get sessions() {
    return this._sessions;
  }

  get session() {
    return this._sessions.getValue();
  }

  get token() {
    return this._token;
  }

  get participant() {
    return this._participant;
  }

  get tokenKey() {
    return `${ParticipantSession.tokenKey}:${this.ns}`;
  }

  get partKey() {
    return `${ParticipantSession.partKey}:${this.ns}`;
  }

  updateSession(token: string, participant: ParticipantIdent) {
    this.strg.setItem(this.tokenKey, token);
    this.strg.setItem(this.partKey, JSON.stringify(participant));
    this._token = token;
    this._participant = participant;
    this._sessions.next(this.calcSession());
  }

  clearSession() {
    delete this._token;
    delete this._participant;
    this.strg.removeItem(this.tokenKey);
    this.strg.removeItem(this.partKey);
    this._sessions.next(undefined);
  }

  private calcSession(): Session | undefined {
    if (this._token && this._participant) {
      return {
        token: this._token,
        participant: this._participant,
      };
    }

    return undefined;
  }

  private get strg() {
    return ParticipantSession.storage;
  }
}
