import { BehaviorSubject, Observable } from "rxjs";

type SaveToken = (token: string) => Promise<void>;
type RetrieveToken = () => Promise<string>;

export abstract class AdminTokenProvider {
  private _tokens: BehaviorSubject<string | undefined>;

  constructor(
    protected retrieveToken: RetrieveToken,
    protected saveToken: SaveToken,
    resetToken: Observable<void>
  ) {
    const token = this.retrieveToken();
    this._tokens = bsu<string | undefined>(token);

    resetToken.subscribe({
      next: () => {
        this.clearSession();
      },
    });
  }

  get tokens() {
    return this._tokens;
  }

  get session() {
    return this._tokens.getValue();
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
    this._tokens.next(this.calcSession());
  }

  clearSession() {
    delete this._token;
    delete this._participant;
    this.strg.removeItem(this.tokenKey);
    this.strg.removeItem(this.partKey);
    this._tokens.next(undefined);
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
}

export function bs<T>(init: T) {
  return new BehaviorSubject<T>(init);
}

function bsu<T>(init: T | undefined = undefined) {
  return new BehaviorSubject<T | undefined>(init);
}
