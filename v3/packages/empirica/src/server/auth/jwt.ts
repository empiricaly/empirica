import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyResult } from "jose";

// Admin JWT verification.
//
// The server itself does not issue admin JWTs. Admins authenticate against
// an external IdP (Firebase, Auth0, Clerk, generic OIDC); the resulting JWT
// is passed to the server as a Bearer token. The verifier checks the
// signature against the IdP's JWKS and confirms standard claims.
//
// For local dev, the dev provider issues HS256 JWTs from a configured
// password — `LocalSecretVerifier` validates those.

export interface AdminClaims {
  /** "sub" claim. */
  subject: string;
  /** "iss" claim. */
  issuer: string;
  email?: string;
  name?: string;
  /** Raw payload for handlers that need extra claims. */
  raw: JWTPayload;
}

export interface JWTVerifier {
  /** Verify a Bearer token and return claims, or throw. */
  verify(token: string): Promise<AdminClaims>;
}

// ── JWKS-based verifier (production) ───────────────────────────────────────

export interface JWKSVerifierOptions {
  /** Issuer expected in the `iss` claim. Required; we never accept any issuer. */
  issuer: string;
  /** Audience expected in the `aud` claim. Optional but strongly recommended. */
  audience?: string | string[];
  /** Fully-qualified JWKS URL. */
  jwksUrl: string | URL;
  /**
   * Allowed clock skew in seconds. Defaults to 60s, which is enough for
   * minor server-clock drift without being lax.
   */
  clockTolerance?: number;
}

export class JWKSVerifier implements JWTVerifier {
  private readonly jwks;

  constructor(private readonly opts: JWKSVerifierOptions) {
    this.jwks = createRemoteJWKSet(new URL(opts.jwksUrl));
  }

  async verify(token: string): Promise<AdminClaims> {
    const result: JWTVerifyResult = await jwtVerify(token, this.jwks, {
      issuer: this.opts.issuer,
      ...(this.opts.audience !== undefined && { audience: this.opts.audience }),
      clockTolerance: this.opts.clockTolerance ?? 60,
    });
    return claimsFrom(result.payload);
  }
}

// ── Local-secret verifier (dev) ────────────────────────────────────────────

export interface LocalSecretVerifierOptions {
  /** Shared secret used to sign dev JWTs. Min 32 chars. */
  secret: string;
  /** Issuer to require. Defaults to "empirica:dev". */
  issuer?: string;
  /** Audience to require. Optional. */
  audience?: string | string[];
}

export class LocalSecretVerifier implements JWTVerifier {
  private readonly secret: Uint8Array;
  private readonly issuer: string;
  private readonly audience?: string | string[];

  constructor(opts: LocalSecretVerifierOptions) {
    if (opts.secret.length < 32) {
      throw new RangeError("dev JWT secret must be at least 32 chars");
    }
    this.secret = new TextEncoder().encode(opts.secret);
    this.issuer = opts.issuer ?? "empirica:dev";
    if (opts.audience !== undefined) this.audience = opts.audience;
  }

  async verify(token: string): Promise<AdminClaims> {
    const result = await jwtVerify(token, this.secret, {
      issuer: this.issuer,
      ...(this.audience !== undefined && { audience: this.audience }),
    });
    return claimsFrom(result.payload);
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function claimsFrom(payload: JWTPayload): AdminClaims {
  if (!payload.sub) throw new Error("admin JWT: missing sub claim");
  if (!payload.iss) throw new Error("admin JWT: missing iss claim");
  const claims: AdminClaims = {
    subject: payload.sub,
    issuer: payload.iss,
    raw: payload,
  };
  const email = (payload as { email?: unknown }).email;
  if (typeof email === "string") claims.email = email;
  const name = (payload as { name?: unknown }).name;
  if (typeof name === "string") claims.name = name;
  return claims;
}

/**
 * A no-op verifier for tests/internal-only deployments. Throws on every call.
 */
export class NoAdminAuthVerifier implements JWTVerifier {
  async verify(): Promise<AdminClaims> {
    throw new Error("admin JWT verification is disabled");
  }
}
