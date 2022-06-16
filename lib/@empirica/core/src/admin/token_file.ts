import fs from "fs/promises";
import { BehaviorSubject, merge, Observable, Subscription } from "rxjs";
import { TajribaConnection } from "../shared/tajriba_connection";
import { error } from "../utils/console";
import { bsu } from "../utils/object";

export class TokenProvider {
  private sub: Subscription | undefined;
  readonly tokens = bsu<string | undefined>(undefined);

  constructor(
    taj: TajribaConnection,
    storage: SavedTokenStorage,
    serviceName: string,
    serviceRegistrationToken: string
  ) {
    let connected = false;
    let token: string | undefined;
    this.sub = merge(taj.connected, storage.tokens).subscribe({
      next: async (tokenOrConnected) => {
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

        try {
          const t = await taj.tajriba.registerService(
            serviceName,
            serviceRegistrationToken
          );

          if (t) {
            storage.updateToken(t);
            this.tokens.next(t);
          }
        } catch (err) {
          error(`token: register service ${(err as Error).message}`);
          return;
        }
      },
    });
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

// async function example() {
//   const tokenFile = "/dsd/dsa";
//   const serviceName = "callbacks";
//   const serviceRegistrationToken = "d6w54q3d51qw3";

//   let taj = <TajribaConnection>{};
//   const reset = new Subject<void>();
//   const strg = await FileTokenStorage.init(tokenFile, reset);
//   const tp = new TokenProvider(
//     taj,
//     strg,
//     serviceName,
//     serviceRegistrationToken
//   );
//   tp.tokens;
// }

interface SavedTokenStorage {
  tokens: BehaviorSubject<string | undefined>;
  updateToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
}

export class FileTokenStorage {
  private _tokens = bsu<string | undefined>(undefined);

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
