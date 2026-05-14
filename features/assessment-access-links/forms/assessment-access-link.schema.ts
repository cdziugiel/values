import { z } from "zod";

export const createAssessmentAccessLinkSchema = z.object({
  tenantSlug: z.string().min(2),
  projectRespondentId: z.string().uuid(),
  assessmentProjectId: z.string().uuid(),
});

export const revokeAssessmentAccessLinkSchema = z.object({
  tenantSlug: z.string().min(2),
  accessLinkId: z.string().uuid(),
  assessmentProjectId: z.string().uuid(),
});

export type CreateAssessmentAccessLinkInput = z.infer<
  typeof createAssessmentAccessLinkSchema
>;

export type RevokeAssessmentAccessLinkInput = z.infer<
  typeof revokeAssessmentAccessLinkSchema
>;