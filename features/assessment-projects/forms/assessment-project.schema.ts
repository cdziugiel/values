import { z } from "zod";

export const assessmentProjectStatusSchema = z.enum([
  "draft",
  "active",
  "closed",
  "archived",
]);

const emptyStringToNull = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  });

const optionalUuid = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  })
  .pipe(z.string().uuid().nullable());

const optionalDateString = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  })
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty.")
      .nullable(),
  );

export const createAssessmentProjectSchema = z.object({
  tenantSlug: z.string().trim().min(2, "Brakuje identyfikatora tenanta."),
  clientOrganizationId: optionalUuid,
  name: z
    .string()
    .trim()
    .min(2, "Nazwa projektu musi mieć co najmniej 2 znaki.")
    .max(180, "Nazwa projektu może mieć maksymalnie 180 znaków."),
  description: emptyStringToNull,
  startsAt: optionalDateString,
  endsAt: optionalDateString,
});

export const updateAssessmentProjectSchema = z.object({
  tenantSlug: z.string().trim().min(2, "Brakuje identyfikatora tenanta."),
  assessmentProjectId: z.string().uuid(),
  clientOrganizationId: optionalUuid,
  name: z
    .string()
    .trim()
    .min(2, "Nazwa projektu musi mieć co najmniej 2 znaki.")
    .max(180, "Nazwa projektu może mieć maksymalnie 180 znaków."),
  description: emptyStringToNull,
  status: assessmentProjectStatusSchema,
  startsAt: optionalDateString,
  endsAt: optionalDateString,
});

export const archiveAssessmentProjectSchema = z.object({
  tenantSlug: z.string().trim().min(2, "Brakuje identyfikatora tenanta."),
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