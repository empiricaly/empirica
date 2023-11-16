import { z } from "zod";

export const factorsSchema = z.record(z.string().min(1), z.any());
export const treatmentSchema = z.object({
  factors: factorsSchema,
  name: z.string().optional(),
});

export const batchConfigSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("custom"),
    config: z.any(),
  }),
  z.object({
    kind: z.literal("simple"),
    config: z.object({
      count: z.number().int().positive(),
      treatments: treatmentSchema.array(),
    }),
  }),
  z.object({
    kind: z.literal("complete"),
    config: z.object({
      treatments: z
        .object({
          count: z.number().int().positive(),
          treatment: treatmentSchema,
        })
        .array(),
    }),
  }),
]);
