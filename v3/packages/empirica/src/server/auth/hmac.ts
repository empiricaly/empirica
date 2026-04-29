import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Id } from "../../shared/id.js";

// HMAC-signed participant tokens.
//
// A participant token is a short, URL-safe, signed payload that says "this
// player is allowed to operate as participant P in batch B until time T."
// We never put PII in the payload; identifiers stay server-side.
//
// Format (URL-safe base64, no padding):
//
//     v1.<payload-b64>.<sig-b64>
//
// Payload = JSON of { p: participantId, b: batchId, e: expEpochMs, n: nonce }.
// Signature = HMAC-SHA256 over the literal "v1.<payload-b64>" using the
// server secret.

export interface ParticipantTokenPayload {
  /** Participant id. */
  participantId: Id<"participant">;
  /** Optional batch scope. Tokens without batch scope are valid for any batch. */
  batchId?: Id<"batch">;
  /** Expiration ms since epoch. */
  expiresAt: number;
}

export interface IssueOptions extends ParticipantTokenPayload {
  /** Override the default 8-byte random nonce (mainly for tests). */
  nonce?: string;
}

const VERSION = "v1";

export class HmacSigner {
  private readonly secret: Buffer;

  constructor(secret: string | Buffer) {
    const buf = typeof secret === "string" ? Buffer.from(secret, "utf8") : secret;
    if (buf.length < 16) {
      throw new RangeError("HMAC secret must be at least 16 bytes");
    }
    this.secret = buf;
  }

  issue(opts: IssueOptions): string {
    if (!Number.isFinite(opts.expiresAt) || opts.expiresAt <= 0) {
      throw new RangeError("expiresAt must be a positive epoch ms");
    }
    const payload = {
      p: opts.participantId,
      ...(opts.batchId !== undefined && { b: opts.batchId }),
      e: Math.floor(opts.expiresAt),
      n: opts.nonce ?? randomBytes(8).toString("base64url"),
    };
    const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
    const signed = `${VERSION}.${payloadB64}`;
    const sig = this.sign(signed);
    return `${signed}.${sig}`;
  }

  /**
   * Verify a token and return its payload, or a structured error.
   *
   * `now` defaults to Date.now(); pass an injected clock value for tests.
   */
  verify(
    token: string,
    now: number = Date.now(),
  ):
    | { ok: true; payload: ParticipantTokenPayload }
    | { ok: false; reason: VerifyError } {
    const parts = token.split(".");
    if (parts.length !== 3) return { ok: false, reason: "malformed" };
    const [version, payloadB64, sig] = parts as [string, string, string];
    if (version !== VERSION) return { ok: false, reason: "unsupported-version" };

    const expected = this.sign(`${version}.${payloadB64}`);
    if (!safeEqual(expected, sig)) return { ok: false, reason: "bad-signature" };

    let payload: { p: string; b?: string; e: number; n: string };
    try {
      payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
        p: string;
        b?: string;
        e: number;
        n: string;
      };
    } catch {
      return { ok: false, reason: "malformed" };
    }
    if (!payload.p || typeof payload.e !== "number") {
      return { ok: false, reason: "malformed" };
    }
    if (payload.e <= now) return { ok: false, reason: "expired" };

    const out: ParticipantTokenPayload = {
      participantId: payload.p as Id<"participant">,
      expiresAt: payload.e,
    };
    if (payload.b !== undefined) out.batchId = payload.b as Id<"batch">;
    return { ok: true, payload: out };
  }

  private sign(input: string): string {
    return base64url(createHmac("sha256", this.secret).update(input).digest());
  }
}

export type VerifyError =
  | "malformed"
  | "unsupported-version"
  | "bad-signature"
  | "expired";

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
