import fs from "fs/promises";
import path from "path";
import { BehaviorSubject, merge, Observable, SubscriptionLike } from "rxjs";
import { TajribaConnection } from "../shared/tajriba_connection";
import { error } from "../utils/console";
import { bsu } from "../utils/object";
import { subscribeAsync } from "./observables";

export class TokenProvider {
  private sub: SubscriptionLike | undefined;
  readonly tokens = bsu<string | null>(undefined);

  constructor(
    taj: TajribaConnection,
    storage: SavedTokenStorage,
    serviceName: string,
    serviceRegistrationToken: string
  ) {
    let connected = false;
    let token: string | null | undefined;
    this.sub = subscribeAsync(
      merge(taj.connected, storage.tokens),
      async (tokenOrConnected) => {
        if (typeof tokenOrConnected === "boolean") {
          connected = tokenOrConnected;
        } else {
          token = tokenOrConnected;
        }

        if (token) {
          this.tokens.next(token);
          return;
        }

        if (!connected) {
          return;
        }

        if (token === undefined) {
          return;
        }

        try {
          const t = await taj.tajriba.registerService(
            serviceName,
            serviceRegistrationToken
          );

          if (t) {
            storage.updateToken(t);
          }
        } catch (err) {
          error(`token: register service ${(err as Error).message}`);
          return;
        }
      }
    );
  }

  get token() {
    return this.tokens.getValue();
  }

  // When stopped, cannot be restarted
  stop() {
    this.sub?.unsubscribe();
    this.sub = undefined;
  }
}

export interface SavedTokenStorage {
  tokens: BehaviorSubject<string | null | undefined>;
  updateToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
}

export class MemTokenStorage {
  tokens = new BehaviorSubject<string | null | undefined>(null);

  async updateToken(token: string) {
    this.tokens.next(token);
  }

  async clearToken() {
    this.tokens.next(undefined);
  }
}

export class FileTokenStorage {
  private _tokens = bsu<string | null>(null);

  private constructor(
    protected serviceTokenFile: string,
    resetToken: Observable<void>
  ) {
    resetToken.subscribe({
      next: () => {
        this.clearToken();
      },
    });
  }

  static async init(serviceTokenFile: string, resetToken: Observable<void>) {
    const p = new this(serviceTokenFile, resetToken);

    const token = await p.readToken();
    if (token) {
      p._tokens.next(token);
    }

    return p;
  }

  private async readToken() {
    try {
      const data = await fs.readFile(this.serviceTokenFile, {
        encoding: "utf8",
      });

      if (data.length > 0) {
        return data;
      }
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "ENOENT") {
        error(`token: read token file ${e.message}`);
      }
    }

    return;
  }

  private async writeToken(token: string) {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.serviceTokenFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.serviceTokenFile, token);
    } catch (err) {
      error(`token: write token file ${(err as Error).message}`);
    }
  }

  private async deleteTokenFile() {
    try {
      await fs.unlink(this.serviceTokenFile);
    } catch (err) {
      error(`token: delete token file ${(err as Error).message}`);
    }
  }

  get tokens() {
    return this._tokens;
  }

  get token() {
    return this._tokens.getValue();
  }

  async updateToken(token: string) {
    if (token === this._tokens.getValue()) {
      return;
    }

    this._tokens.next(token);
    await this.writeToken(token);
  }

  async clearToken() {
    await this.deleteTokenFile();

    if (this.token) {
      this._tokens.next(undefined);
    }
  }
}
