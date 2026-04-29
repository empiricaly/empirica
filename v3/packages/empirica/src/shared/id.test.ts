import { describe, expect, it } from "vitest";
import { isId, newId } from "./id.js";

describe("newId", () => {
  it("returns a 21-char URL-safe string", () => {
    const id = newId();
    expect(id).toHaveLength(21);
    expect(id).toMatch(/^[0-9a-zA-Z_-]{21}$/);
  });

  it("returns a fresh id every call", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1_000; i++) ids.add(newId());
    expect(ids.size).toBe(1_000);
  });
});

describe("isId", () => {
  it("accepts a freshly generated id", () => {
    expect(isId(newId())).toBe(true);
  });

  it("rejects shorter or longer strings", () => {
    expect(isId("short")).toBe(false);
    expect(isId("a".repeat(22))).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isId(123)).toBe(false);
    expect(isId(null)).toBe(false);
    expect(isId(undefined)).toBe(false);
    expect(isId({})).toBe(false);
    expect(isId([])).toBe(false);
  });

  it("rejects strings with disallowed characters", () => {
    expect(isId("!".repeat(21))).toBe(false);
    expect(isId(`${"a".repeat(20)} `)).toBe(false);
  });
});
