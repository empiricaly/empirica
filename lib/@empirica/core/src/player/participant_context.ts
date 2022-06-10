import {
  ParticipantIdent,
  Tajriba,
  TajribaParticipant,
} from "@empirica/tajriba";
import { BehaviorSubject, merge, Observable } from "rxjs";
import { Globals } from "./globals";
import { TajribaProvider } from "./provider";

const defaultTokenKey = "emp:part:token";
const defaultPartKey = "emp:part";

interface Session {
  token: string;
  participant: ParticipantIdent;
}

export type Mode<T> = (participantID: string, provider: TajribaProvider) => T;

export class ParticipantContext {
  private _session: BehaviorSubject<Session | undefined>;
  private _token?: string;
  protected _participant?: ParticipantIdent;
  private _tajriba = new BehaviorSubject<Tajriba | undefined>(undefined);
  private _tajribaConn = new BehaviorSubject(false);
  private _tajribaPart = new BehaviorSubject<TajribaParticipant | undefined>(
    undefined
  );
  private _tajribaPartConn = new BehaviorSubject(false);
  protected _provider = new BehaviorSubject<TajribaProvider | undefined>(
    undefined
  );
  protected _globals = new BehaviorSubject<Globals | undefined>(undefined);
  private _authenticating: BehaviorSubject<boolean>;
  private _stopped = false;

  constructor(
    private url: string,
    private ns: string,
    private strg: Storage = window.localStorage
  ) {
    this._token = strg.getItem(this.tokenKey) || undefined;

    const participantStr = strg.getItem(this.partKey) || undefined;
    if (participantStr) {
      this._participant = JSON.parse(participantStr);
    }

    const sess = this.calcSession();
    this._session = new BehaviorSubject<Session | undefined>(sess);

    this._authenticating = new BehaviorSubject(Boolean(sess));

    this.initTajriba();
    this.initTajribaPart();
    this.initTajribaProvider();
    this.initGlobals();
  }

  stop() {
    this.stopTaj();
    this.stopTajPart();

    this._stopped = true;
  }

  private stopTaj() {
    const taj = this._tajriba.getValue();
    if (taj) {
      taj.removeAllListeners("connected");
      taj.removeAllListeners("disconnected");
      taj.stop();
      this._tajriba.next(undefined);
    }

    this._authenticating.next(false);
  }

  private stopTajPart() {
    const taj = this._tajribaPart.getValue();
    if (taj) {
      taj.removeAllListeners("connected");
      taj.removeAllListeners("disconnected");
      taj.stop();
      this._tajribaPart.next(undefined);
    }
  }

  private async initTajriba() {
    try {
      const tajriba = await Tajriba.create(this.url);
      if (this._stopped) {
        tajriba.stop();

        return;
      }

      this._tajriba.next(tajriba);

      tajriba.on(
        "connected",
        this._tajribaConn.next.bind(this._tajribaConn, true)
      );
      tajriba.on("disconnected", () =>
        this._tajribaConn.next.bind(this._tajribaConn, false)
      );
    } catch (error) {
      this.stopTaj();
    }
  }

  private async initTajribaPart() {
    merge(this._tajriba, this._session).subscribe({
      next: async () => {
        if (this._stopped) {
          this._authenticating.next(false);

          return;
        }

        const taj = this._tajriba.getValue();
        const sess = this._session.getValue();
        if (taj && sess) {
          try {
            const tajPart = await taj.sessionParticipant(
              sess.token,
              sess.participant
            );

            this._tajribaPart.next(tajPart);
            this._authenticating.next(false);

            tajPart.on(
              "connected",
              this._tajribaPartConn.next.bind(this._tajribaPartConn, true)
            );
            tajPart.on("disconnected", () =>
              this._tajribaPartConn.next.bind(this._tajribaPartConn, false)
            );
          } catch (error) {
            this.stopTajPart();
            this.clearSession();
          }

          this._authenticating.next(false);
        } else {
          this.stopTajPart();
        }
      },
    });
  }

  private async initTajribaProvider() {
    this._tajribaPart.subscribe({
      next: async (tajPart) => {
        const taj = this._tajriba.getValue();
        if (tajPart && taj) {
          this._provider.next(
            new TajribaProvider(
              tajPart.changes(),
              taj.globalAttributes(),
              tajPart.setAttributes.bind(tajPart)
            )
          );
        } else {
          const provider = this._provider.getValue();
          if (provider) {
            this._provider.next(undefined);
          }
        }
      },
    });
  }

  private async initGlobals() {
    this._tajriba.subscribe({
      next: async (taj) => {
        if (taj) {
          this._globals.next(new Globals(taj.globalAttributes()));
        } else {
          const glob = this._globals.getValue();
          if (glob) {
            this._globals.next(undefined);
          }
        }
      },
    });
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

  get authenticating(): Observable<boolean> {
    return this._authenticating;
  }

  get tajribaConnected(): Observable<boolean> {
    return this._tajribaConn;
  }

  get tajribaParticipantConnected(): Observable<boolean> {
    return this._tajribaPartConn;
  }

  get session(): Observable<Session | undefined> {
    return this._session;
  }

  get tajriba(): Observable<Tajriba | undefined> {
    return this._tajriba;
  }

  get tajribaParticipant(): Observable<TajribaParticipant | undefined> {
    return this._tajribaPart;
  }

  get provider(): Observable<TajribaProvider | undefined> {
    return this._provider;
  }

  get globals(): Observable<Globals | undefined> {
    return this._globals;
  }

  get token() {
    return this._token;
  }

  get tokenKey() {
    return `${defaultTokenKey}:${this.ns}`;
  }

  get partKey() {
    return `${defaultPartKey}:${this.ns}`;
  }

  clearSession() {
    delete this._token;
    delete this._participant;
    this.strg.removeItem(this.tokenKey);
    this.strg.removeItem(this.partKey);
    this._session.next(undefined);
  }

  updateSession(token: string, participant: ParticipantIdent) {
    this.strg.setItem(this.tokenKey, token);
    this.strg.setItem(this.partKey, JSON.stringify(participant));
    this._token = token;
    this._participant = participant;
    this._session.next(this.calcSession());
  }

  async register(playerIdentifier: string) {
    const taj = this._tajriba.getValue();
    if (!taj) {
      throw new Error("tajriba not connected");
    }

    try {
      this._authenticating.next(true);
      const [token, participant] = await taj.registerParticipant(
        playerIdentifier
      );

      if (!token) {
        throw new Error("logged in but no token");
      }

      this.updateSession(token, participant);
    } catch (error) {
      this._authenticating.next(false);
    }
  }
}

export class ParticipantModeContext<T> extends ParticipantContext {
  private _mode = new BehaviorSubject<T | undefined>(undefined);

  constructor(
    url: string,
    ns: string,
    strg: Storage = window.localStorage,
    private modeFunc: Mode<T>
  ) {
    super(url, ns, strg);
    this.initMode();
  }

  private async initMode() {
    this._provider.subscribe({
      next: async (provider) => {
        const id = this._participant?.id;
        if (id && provider) {
          this._mode.next(this.modeFunc(id, provider));
        } else {
          const mode = this._mode.getValue();
          if (mode) {
            this._mode.next(undefined);
          }
        }
      },
    });
  }

  get mode(): Observable<T | undefined> {
    return this._mode;
  }
}
