import { z } from "zod";
// import { Game, Round, Stage } from "./models";

export const treatmentSchema = z.record(z.string().min(1), z.any());
export const batchConfigSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("custom"),
    config: z.any(),
  }),
  z.object({
    kind: z.literal("simple"),
    config: z.object({
      count: z.number().int().positive(),
      treatments: z
        .object({
          factors: treatmentSchema,
        })
        .array(),
    }),
  }),
  z.object({
    kind: z.literal("complete"),
    config: z.object({
      treatments: z
        .object({
          count: z.number().int().positive(),
          treatment: z.object({
            factors: treatmentSchema,
          }),
        })
        .array(),
    }),
  }),
]);

// // const isBatch = z.instanceof(Batch).parse;
// export const isGame = z.instanceof(Game).parse;
// export const isRound = z.instanceof(Round).parse;
// export const isStage = z.instanceof(Stage).parse;
// export const isString = z.string().parse;
