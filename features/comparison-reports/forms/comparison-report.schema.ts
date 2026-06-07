// features/comparison-reports/forms/comparison-report.schema.ts

import { z } from "zod";

export const peerComparisonReportInputSchema = z.object({
  ownSessionId: z.string().uuid(),
  ownQuestionnaireVersionId: z.string().uuid(),
  otherToken: z.string().min(24).max(256),
});

export type PeerComparisonReportInput = z.infer<
  typeof peerComparisonReportInputSchema
>;