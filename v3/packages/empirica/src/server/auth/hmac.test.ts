import { describe, expect, it } from "vitest";
import type { Id } from "../../shared/id.js";
import { HmacSigner } from "./hmac.js";

const SECRET = "0123456789abcdef0123456789abcdef";
const PARTICIPANT = "p".repeat(21) as Id<"participant">;
const BATCH = "b".repeat(21) as Id<"batch">;

describe("HmacSigner", () => {
  it("rejects short secrets", () => {
    expect(() => new HmacSigner("short")).toThrow(RangeError);
  });

  it("issue then verify round-trips the payload", () => {
    const signer = new HmacSigner(SECRET);
    const token = signer.issue({
      participantId: PARTICIPANT,
      batchId: BATCH,
      expiresAt: 1_000_000,
    });

    const r = signer.verify(token, 999_999);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.participantId).toBe(PARTICIPANT);
      expect(r.payload.batchId).toBe(BATCH);
      expect(r.payload.expiresAt).toBe(1_000_000);
    }
  });

  it("issue without batchId omits it from the verified payload", () => {
    const signer = new HmacSigner(SECRET);
    const token = signer.issue({ participantId: PARTICIPANT, expiresAt: 1_000_000 });
    const r = signer.verify(token, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.batchId).toBeUndefined();
    }
  });

  it("a token signed with one secret cannot verify with another", () => {
    const a = new HmacSigner(SECRET);
    const b = new HmacSigner("ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ");
    const token = a.issue({ participantId: PARTICIPANT, expiresAt: 1_000_000 });
    const r = b.verify(token, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad-signature");
  });

  it("verify rejects expired tokens", () => {
    const signer = new HmacSigner(SECRET);
    const token = signer.issue({ participantId: PARTICIPANT, expiresAt: 100 });
    const r = signer.verify(token, 200);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });

  it("verify rejects malformed tokens", () => {
    const signer = new HmacSigner(SECRET);
    expect(signer.verify("garbage", 0)).toMatchObject({ ok: false, reason: "malformed" });
    expect(signer.verify("v1.garbage.garbage", 0)).toMatchObject({
      ok: false,
      reason: "bad-signature",
    });
    expect(signer.verify("v9.x.y", 0)).toMatchObject({
      ok: false,
      reason: "unsupported-version",
    });
  });

  it("nonce is included so two tokens with same payload differ", () => {
    const signer = new HmacSigner(SECRET);
    const a = signer.issue({ participantId: PARTICIPANT, expiresAt: 1_000_000 });
    const b = signer.issue({ participantId: PARTICIPANT, expiresAt: 1_000_000 });
    expect(a).not.toBe(b);
  });

  it("tamper with the payload invalidates the signature", () => {
    const signer = new HmacSigner(SECRET);
    const token = signer.issue({ participantId: PARTICIPANT, expiresAt: 1_000_000 });

    const [version, , sig] = token.split(".");
    const tampered = `${version}.${Buffer.from('{"p":"x","e":9999999}').toString("base64url")}.${sig}`;
    const r = signer.verify(tampered, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad-signature");
  });
});
