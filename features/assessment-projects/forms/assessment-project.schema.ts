import { z } from "zod";

export const assessmentProjectStatusSchema = z.enum([
  "draft",
  "active",
  "closed",
  "archived",
]);

const optionalDateString = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => {
    if (!value) return null;
    return value;
  });

export const createAssessmentProjectSchema = z.object({
  tenantSlug: z.string().min(2),
  clientOrganizationId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(180),
  description: z.string().max(2000).optional().or(z.literal("")),
  startsAt: optionalDateString,
  endsAt: optionalDateString,
});

export const updateAssessmentProjectSchema = z.object({
  tenantSlug: z.string().min(2),
  assessmentProjectId: z.string().uuid(),
  clientOrganizationId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(180),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: assessmentProjectStatusSchema,
  startsAt: optionalDateString,
  endsAt: optionalDateString,
});

export const archiveAssessmentProjectSchema = z.object({
  tenantSlug: z.string().min(2),
  assessmentProjectId: z.string().uuid(),
});

export type AssessmentProjectStatus = z.infer<
  typeof assessmentProjectStatusSchema
>;

export type CreateAssessmentProjectInput = z.infer<
  typeof createAssessmentProjectSchema
>;

export type UpdateAssessmentProjectInput = z.infer<
  typeof updateAssessmentProjectSchema
>;

export type ArchiveAssessmentProjectInput = z.infer<
  typeof archiveAssessmentProjectSchema
>;

export const ASSESSMENT_PROJECT_STATUS_OPTIONS: {
  value: AssessmentProjectStatus;
  label: string;
}[] = [
  { value: "draft", label: "draft" },
  { value: "active", label: "active" },
  { value: "closed", label: "closed" },
  { value: "archived", label: "archived" },
];