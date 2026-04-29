import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  defineTreatments,
  freezeFactors,
  parseFactors,
  TreatmentDefinitionError,
} from "./define.js";

const Factors = z.object({
  playerCount: z.number().int().positive(),
  rounds: z.number().int().positive(),
});

describe("defineTreatments", () => {
  it("returns a typed set keyed by name", () => {
    const set = defineTreatments(Factors, [
      { name: "solo", factors: { playerCount: 1, rounds: 5 } },
      { name: "group", factors: { playerCount: 4, rounds: 5 } },
    ]);

    expect(set.list).toHaveLength(2);
    expect(set.byName("solo")?.factors.playerCount).toBe(1);
    expect(set.byName("missing")).toBeUndefined();
  });

  it("rejects duplicate names", () => {
    expect(() =>
      defineTreatments(Factors, [
        { name: "solo", factors: { playerCount: 1, rounds: 5 } },
        { name: "solo", factors: { playerCount: 2, rounds: 5 } },
      ]),
    ).toThrow(TreatmentDefinitionError);
  });

  it("rejects invalid names", () => {
    expect(() =>
      defineTreatments(Factors, [
        { name: "1starts-with-digit", factors: { playerCount: 1, rounds: 5 } },
      ]),
    ).toThrow(TreatmentDefinitionError);

    expect(() =>
      defineTreatments(Factors, [
        { name: "", factors: { playerCount: 1, rounds: 5 } },
      ]),
    ).toThrow(TreatmentDefinitionError);
  });

  it("validates factors against the supplied schema", () => {
    expect(() =>
      defineTreatments(Factors, [
        { name: "bad", factors: { playerCount: -1, rounds: 5 } as never },
      ]),
    ).toThrow(TreatmentDefinitionError);
  });

  it("preserves description when given", () => {
    const set = defineTreatments(Factors, [
      {
        name: "solo",
        factors: { playerCount: 1, rounds: 5 },
        description: "single player",
      },
    ]);
    expect(set.byName("solo")?.description).toBe("single player");
  });
});

describe("freezeFactors", () => {
  it("returns a deep clone", () => {
    const original = { a: 1, b: { c: [1, 2, 3] } };
    const frozen = freezeFactors(original);
    expect(frozen).toEqual(original);

    frozen.b.c.push(4);
    expect(original.b.c).toEqual([1, 2, 3]);
  });
});

describe("parseFactors", () => {
  it("returns parsed data on success", () => {
    const r = parseFactors(Factors, { playerCount: 4, rounds: 5 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.factors.playerCount).toBe(4);
  });

  it("returns flat error messages on failure", () => {
    const r = parseFactors(Factors, { playerCount: -1, rounds: "five" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThanOrEqual(2);
      expect(r.errors.some((e) => e.includes("playerCount"))).toBe(true);
      expect(r.errors.some((e) => e.includes("rounds"))).toBe(true);
    }
  });
});
