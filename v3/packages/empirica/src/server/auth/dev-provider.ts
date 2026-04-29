import { SignJWT } from "jose";

// Dev provider
//
// Issues short-lived HS256 JWTs from a configured admin password. Intended
// for local development and small self-hosted deployments where pulling in a
// full IdP isn't worth it. NOT recommended for production with multiple
// admins.
//
// The runtime accepts a username/password POST and, on match, returns a JWT
// the LocalSecretVerifier can validate. Email/name are pulled from the user
// table.

export interface DevAdmin {
  username: string;
  /**
   * bcrypt-style hash of the password. Plaintext is rejected. Use the
   * `hashDevPassword` helper to generate.
   */
  passwordHash: string;
  email?: string;
  displayName?: string;
}

export interface DevProviderOptions {
  /** JWT signing secret (must match the verifier's secret). */
  secret: string;
  /** Token validity in seconds. Default 1 hour. */
  ttlSeconds?: number;
  /** Issuer claim. Default "empirica:dev". */
  issuer?: string;
  /** Audience claim. Optional. */
  audience?: string | string[];
}

export class DevProvider {
  private readonly secret: Uint8Array;
  private readonly ttl: number;
  private readonly issuer: string;
  private readonly audience?: string | string[];

  constructor(opts: DevProviderOptions) {
    if (opts.secret.length < 32) {
      throw new RangeError("dev JWT secret must be at least 32 chars");
    }
    this.secret = new TextEncoder().encode(opts.secret);
    this.ttl = opts.ttlSeconds ?? 3_600;
    this.issuer = opts.issuer ?? "empirica:dev";
    if (opts.audience !== undefined) this.audience = opts.audience;
  }

  async signFor(admin: { username: string; email?: string; displayName?: string }): Promise<string> {
    const claims: Record<string, string> = {};
    if (admin.email) claims.email = admin.email;
    if (admin.displayName) claims.name = admin.displayName;

    const jwt = new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(admin.username)
      .setIssuer(this.issuer)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + this.ttl);
    if (this.audience !== undefined) jwt.setAudience(this.audience);
    return jwt.sign(this.secret);
  }
}
