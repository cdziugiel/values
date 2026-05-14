import { z } from "zod";

export const assessmentProjectRespondentStatusSchema = z.enum([
  "invited",
  "started",
  "completed",
  "excluded",
  "archived",
]);

export const addAssessmentProjectRespondentSchema = z.object({
  tenantSlug: z.string().min(2),
  assessmentProjectId: z.string().uuid(),
  respondentId: z.string().uuid(),
});

export const updateAssessmentProjectRespondentSchema = z.object({
  tenantSlug: z.string().min(2),
  projectRespondentId: z.string().uuid(),
  assessmentProjectId: z.string().uuid(),
  status: assessmentProjectRespondentStatusSchema,
});

export const archiveAssessmentProjectRespondentSchema = z.object({
  tenantSlug: z.string().min(2),
  projectRespondentId: z.string().uuid(),
  assessmentProjectId: z.string().uuid(),
});

export type AssessmentProjectRespondentStatus = z.infer<
  typeof assessmentProjectRespondentStatusSchema
>;

export type AddAssessmentProjectRespondentInput = z.infer<
  typeof addAssessmentProjectRespondentSchema
>;

export type UpdateAssessmentProjectRespondentInput = z.infer<
  typeof updateAssessmentProjectRespondentSchema
>;

export type ArchiveAssessmentProjectRespondentInput = z.infer<
  typeof archiveAssessmentProjectRespondentSchema
>;

export const ASSESSMENT_PROJECT_RESPONDENT_STATUS_OPTIONS: {
  value: AssessmentProjectRespondentStatus;
  label: string;
}[] = [
  { value: "invited", label: "invited" },
  { value: "started", label: "started" },
  { value: "completed", label: "completed" },
  { value: "excluded", label: "excluded" },
  { value: "archived", label: "archived" },
];