import { z } from "zod";
import type { Json, JsonObject } from "../../shared/json.js";

// Treatment definition
//
// A user supplies a zod schema for the *factors* that go into a treatment;
// we validate every treatment instance against it. Treatments are then
// frozen into games at creation time (deep-copy onto games.treatment_json),
// so editing a treatment never mutates running games.
//
// Usage:
//
//   const Factors = z.object({ playerCount: z.number().int().positive() });
//   export default defineTreatments(Factors, [
//     { name: "solo",  factors: { playerCount: 1 } },
//     { name: "group", factors: { playerCount: 4 } },
//   ]);

export interface TreatmentInput<F extends JsonObject> {
  name: string;
  factors: F;
  /** Optional human description for the admin UI. */
  description?: string;
}

export interface Treatment<F extends JsonObject> {
  name: string;
  factors: F;
  description?: string;
}

export interface TreatmentSet<F extends JsonObject> {
  /** The zod schema for factors. Used by the admin UI for validation. */
  schema: z.ZodType<F>;
  list: ReadonlyArray<Treatment<F>>;
  byName(name: string): Treatment<F> | undefined;
}

const NAME_RE = /^[A-Za-z][A-Za-z0-9 _.-]{0,79}$/;

export class TreatmentDefinitionError extends Error {
  public readonly zodError?: unknown;
  constructor(message: string, zodError?: unknown) {
    super(message);
    this.name = "TreatmentDefinitionError";
    if (zodError !== undefined) this.zodError = zodError;
  }
}

export function defineTreatments<F extends JsonObject>(
  schema: z.ZodType<F>,
  inputs: ReadonlyArray<TreatmentInput<F>>,
): TreatmentSet<F> {
  const seen = new Set<string>();
  const out: Treatment<F>[] = [];

  for (const t of inputs) {
    if (!NAME_RE.test(t.name)) {
      throw new TreatmentDefinitionError(
        `treatment name ${JSON.stringify(t.name)} is invalid (must match ${NAME_RE.source})`,
      );
    }
    if (seen.has(t.name)) {
      throw new TreatmentDefinitionError(`duplicate treatment name: ${t.name}`);
    }
    seen.add(t.name);

    const parsed = schema.safeParse(t.factors);
    if (!parsed.success) {
      throw new TreatmentDefinitionError(
        `treatment ${JSON.stringify(t.name)} has invalid factors: ${parsed.error.message}`,
        parsed.error,
      );
    }
    const treatment: Treatment<F> = {
      name: t.name,
      factors: parsed.data,
    };
    if (t.description !== undefined) treatment.description = t.description;
    out.push(treatment);
  }

  const byNameMap = new Map<string, Treatment<F>>(out.map((t) => [t.name, t]));

  return {
    schema,
    list: out,
    byName: (name) => byNameMap.get(name),
  };
}

/**
 * Deep-clone (via JSON) a value that is known to be JSON-safe. Used when
 * freezing factors onto a game.
 */
export function freezeFactors<F extends JsonObject>(factors: F): F {
  return JSON.parse(JSON.stringify(factors)) as F;
}

/**
 * Validate an arbitrary JSON blob (e.g., from an admin request) against the
 * factor schema. Returns either the parsed factors or a list of error
 * messages suitable for display to the user.
 */
export function parseFactors<F extends JsonObject>(
  schema: z.ZodType<F>,
  raw: Json,
): { ok: true; factors: F } | { ok: false; errors: string[] } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, factors: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
    ),
  };
}
