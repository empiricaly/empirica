import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { LocalSecretVerifier } from "./jwt.js";

const SECRET = "this-is-a-very-long-secret-okay!!!!";

async function mintDevToken(claims: {
  sub: string;
  iss?: string;
  aud?: string;
  email?: string;
  exp?: number;
}): Promise<string> {
  const enc = new TextEncoder().encode(SECRET);
  const jwt = new SignJWT({
    ...(claims.email !== undefined && { email: claims.email }),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(claims.iss ?? "empirica:dev")
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? Math.floor(Date.now() / 1000) + 60);
  if (claims.aud !== undefined) jwt.setAudience(claims.aud);
  return jwt.sign(enc);
}

describe("LocalSecretVerifier", () => {
  it("verifies a valid token and returns claims", async () => {
    const v = new LocalSecretVerifier({ secret: SECRET });
    const token = await mintDevToken({ sub: "u1", email: "a@b.com" });

    const claims = await v.verify(token);
    expect(claims.subject).toBe("u1");
    expect(claims.issuer).toBe("empirica:dev");
    expect(claims.email).toBe("a@b.com");
  });

  it("rejects an expired token", async () => {
    const v = new LocalSecretVerifier({ secret: SECRET });
    const token = await mintDevToken({
      sub: "u1",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    await expect(v.verify(token)).rejects.toThrow();
  });

  it("rejects a token with the wrong issuer", async () => {
    const v = new LocalSecretVerifier({ secret: SECRET, issuer: "expected:iss" });
    const token = await mintDevToken({ sub: "u1", iss: "wrong:iss" });
    await expect(v.verify(token)).rejects.toThrow();
  });

  it("rejects when audience required but missing", async () => {
    const v = new LocalSecretVerifier({ secret: SECRET, audience: "empirica" });
    const token = await mintDevToken({ sub: "u1" });
    await expect(v.verify(token)).rejects.toThrow();
  });

  it("rejects a tampered signature", async () => {
    const v = new LocalSecretVerifier({ secret: SECRET });
    const token = await mintDevToken({ sub: "u1" });
    const tampered = token.slice(0, -3) + "AAA";
    await expect(v.verify(tampered)).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    const v = new LocalSecretVerifier({ secret: SECRET });
    const otherEnc = new TextEncoder().encode("X".repeat(48));
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setIssuer("empirica:dev")
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
      .sign(otherEnc);
    await expect(v.verify(token)).rejects.toThrow();
  });

  it("requires a long enough secret", () => {
    expect(() => new LocalSecretVerifier({ secret: "short" })).toThrow(RangeError);
  });
});
