// features/comparison-reports/forms/comparison-share.schema.ts

import { z } from "zod";

export const createComparisonShareSchema = z.object({
  assessmentSessionId: z.string().uuid(),
  questionnaireVersionId: z.string().uuid(),
  label: z.string().max(255).optional(),
  expiresInDays: z.number().int().min(1).max(90).default(14),
  isSingleUse: z.boolean().default(false),
});

export const revokeComparisonShareSchema = z.object({
  shareId: z.string().uuid(),
});