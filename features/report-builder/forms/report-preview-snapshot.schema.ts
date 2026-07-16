import { z } from "zod";

const finiteNumberSchema = z
  .number()
  .finite()
  .min(-1_000_000)
  .max(1_000_000);

export const syntheticScoreValueSchema = z.object({
  dimensionCode: z.string().trim().min(1).max(200),
  value: finiteNumberSchema,
});

export const syntheticCrossScoreMatrixSchema = z
  .object({
    primaryCategory: z.string().trim().min(1).max(200),
    filterCategory: z.string().trim().min(1).max(200),
    values: z.record(
      z.string().trim().min(1).max(200),
      z.record(
        z.string().trim().min(1).max(200),
        finiteNumberSchema.nullable(),
      ),
    ),
  })
  .refine(
    (value) => value.primaryCategory !== value.filterCategory,
    {
      message:
        "Kategoria główna i kategoria przekroju muszą być różne.",
      path: ["filterCategory"],
    },
  );

export const createSyntheticReportPreviewSchema = z.object({
  reportTemplateVersionId: z.string().uuid(),
  questionnaireVersionId: z.string().uuid(),
  scoreCategory: z.string().trim().min(1).max(200),
  scores: z.array(syntheticScoreValueSchema).max(500),
  crossMatrices: z.array(syntheticCrossScoreMatrixSchema).max(20),
});

export type CreateSyntheticReportPreviewInput = z.infer<
  typeof createSyntheticReportPreviewSchema
>;

export type SyntheticCrossScoreMatrix = z.infer<
  typeof syntheticCrossScoreMatrixSchema
>;
