import { z } from "zod";

export const addAssessmentProjectQuestionnaireSchema = z.object({
  tenantSlug: z.string().min(2),
  assessmentProjectId: z.string().uuid(),
  questionnaireId: z.string().uuid(),
  questionnaireVersionId: z.string().uuid(),
});

export const archiveAssessmentProjectQuestionnaireSchema = z.object({
  tenantSlug: z.string().min(2),
  assessmentProjectId: z.string().uuid(),
  projectQuestionnaireId: z.string().uuid(),
});

export type AddAssessmentProjectQuestionnaireInput = z.infer<
  typeof addAssessmentProjectQuestionnaireSchema
>;

export type ArchiveAssessmentProjectQuestionnaireInput = z.infer<
  typeof archiveAssessmentProjectQuestionnaireSchema
>;