import "global-jsdom/register";

import {
  ParticipantIdent,
  Tajriba,
  TajribaParticipant,
} from "@empirica/tajriba";
import { BehaviorSubject, merge, Observable, Subject } from "rxjs";
import { Globals } from "./globals";
import { TajribaProvider } from "./provider";

export interface Session {
  token: string;
  participant: ParticipantIdent;
}

function bs<T>(init: T) {
  return new BehaviorSubject<T>(init);
}

function bsu<T>(init: T | undefined = undefined) {
  return new BehaviorSubject<T | undefined>(init);
}

export class ParticipantContext {
  readonly tajriba: TajribaConnection;
  readonly participant: ParticipantConnection;
  readonly session: ParticipantSession;
  readonly resetSession: Subject<void>;
  readonly provider = bsu<TajribaProvider>();
  readonly globals = bsu<Globals>();

  constructor(url: string, ns: string) {
    this.tajriba = new TajribaConnection(url);
    this.resetSession = new Subject<void>();
    this.session = new ParticipantSession(ns, this.resetSession);
    this.participant = new ParticipantConnection(
      this.tajriba,
      this.session.sessions,
      this.resetSession.next.bind(this.resetSession)
    );

    this.participant.connected.subscribe({
      next: async (connected) => {
        const part = this.participant.participant.getValue();
        if (connected && part) {
          if (!this.provider.getValue()) {
            this.provider.next(
              new TajribaProvider(
                part.changes(),
                this.tajriba.tajriba.globalAttributes(),
                this.tajriba.tajriba.setAttributes.bind(this.tajriba.tajriba)
              )
            );
          }
        } else {
          const provider = this.provider.getValue();
          if (provider) {
            this.provider.next(undefined);
          }
        }
      },
    });

    this.tajriba.connected.subscribe({
      next: async (connected) => {
        if (connected) {
          this.globals.next(
            new Globals(this.tajriba.tajriba.globalAttributes())
          );
        } else {
          const glob = this.globals.getValue();
          if (glob) {
            this.globals.next(undefined);
          }
        }
      },
    });
  }

  async register(playerIdentifier: string) {
    if (!this.tajriba.connected.getValue()) {
      throw ErrNotConnected;
    }
    this.participant.connecting.next(true);

    const [token, participant] = await this.tajriba.tajriba.registerParticipant(
      playerIdentifier
    );

    if (!token) {
      this.participant.connecting.next(false);
      throw new Error("invalid registration");
    }

    this.session.updateSession(token, participant);
  }

  stop() {
    this.tajriba.stop();
    this.participant.stop();
  }
}

export class ParticipantSession {
  static tokenKey = "empirica:token";
  static partKey = "empirica:participant";
  static storage: Storage = window.localStorage;

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
          if (this._connected.getValue()) {
          }

          return;
        }

        if (this._connected.getValue()) {
          return;
        }

        this._connecting.next(true);

        try {
          const tajPart = await taj.session(session.token, session.participant);

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
        } catch (error) {
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

const ErrNotConnected = new Error("not connected");

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

  async session(token: string, pident: ParticipantIdent) {
    if (!this._connected.getValue()) {
      throw ErrNotConnected;
    }

    return await this.tajriba.sessionParticipant(token, pident);
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

export type Mode<T> = (participantID: string, provider: TajribaProvider) => T;

export class ParticipantMode<T> {
  private _mode = new BehaviorSubject<T | undefined>(undefined);

  constructor(
    participant: BehaviorSubject<TajribaParticipant | undefined>,
    provider: BehaviorSubject<TajribaProvider | undefined>,
    modeFunc: Mode<T>
  ) {
    provider.subscribe({
      next: async (provider) => {
        const id = participant.getValue()?.id;
        if (id && provider) {
          this._mode.next(modeFunc(id, provider));
        } else {
          const mode = this._mode.getValue();
          if (mode) {
            this._mode.next(undefined);
          }
        }
      },
    });
  }

  get mode() {
    return this._mode;
  }
}

export class ParticipantModeContext<T> extends ParticipantContext {
  private _mode: ParticipantMode<T>;

  constructor(url: string, ns: string, modeFunc: Mode<T>) {
    super(url, ns);
    this._mode = new ParticipantMode<T>(
      this.participant.participant,
      this.provider,
      modeFunc
    );
  }

  get mode() {
    return this._mode.mode;
  }
}
