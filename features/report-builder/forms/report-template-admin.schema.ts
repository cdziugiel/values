// features/report-builder/forms/report-template-admin.schema.ts

import { z } from "zod";

export const reportTemplateKindSchema = z.enum([
  "personal",
  "personal_composite",
  "project_aggregate",
  "organization_aggregate",
  "team_aggregate",
  "comparison",
]);

export const reportTemplateStatusSchema = z.enum([
  "draft",
  "active",
  "archived",
]);

export const reportTemplateVersionStatusSchema = z.enum([
  "draft",
  "active",
  "archived",
]);

export const reportPageSizeSchema = z.enum(["A4"]);

export const reportOrientationSchema = z.enum(["portrait", "landscape"]);

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

const optionalUuidString = z.preprocess(
  normalizeOptionalText,
  z.string().uuid().optional(),
);

function isQuestionnaireBoundReportKind(
  kind: z.infer<typeof reportTemplateKindSchema>,
) {
  return kind === "personal";
}

export const createReportTemplateSchema = z
  .object({
    questionnaireId: optionalUuidString,

    kind: reportTemplateKindSchema.default("personal"),

    code: z
      .string()
      .min(1, "Podaj kod template’u.")
      .max(120)
      .transform(normalizeCode),

    name: z.string().trim().min(1, "Podaj nazwę template’u.").max(255),

    description: z.preprocess(normalizeOptionalText, z.string().optional()),
  })
  .superRefine((value, ctx) => {
    if (
      isQuestionnaireBoundReportKind(value.kind) &&
      !value.questionnaireId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questionnaireId"],
        message: "Raport personalny musi być powiązany z kwestionariuszem.",
      });
    }
  });

export const updateReportTemplateSchema = z
  .object({
    reportTemplateId: z.string().uuid(),

    questionnaireId: optionalUuidString,

    kind: reportTemplateKindSchema.default("personal"),

    code: z
      .string()
      .min(1, "Podaj kod template’u.")
      .max(120)
      .transform(normalizeCode),

    name: z.string().trim().min(1, "Podaj nazwę template’u.").max(255),

    description: z.preprocess(normalizeOptionalText, z.string().optional()),

    status: reportTemplateStatusSchema,
  })
  .superRefine((value, ctx) => {
    if (
      isQuestionnaireBoundReportKind(value.kind) &&
      !value.questionnaireId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questionnaireId"],
        message: "Raport personalny musi być powiązany z kwestionariuszem.",
      });
    }
  });

export const archiveReportTemplateSchema = z.object({
  reportTemplateId: z.string().uuid(),
});

export const createReportTemplateVersionSchema = z.object({
  reportTemplateId: z.string().uuid(),

  questionnaireVersionId: optionalUuidString,

  version: z.string().trim().min(1, "Podaj oznaczenie wersji.").max(80),

  name: z.string().trim().min(1, "Podaj nazwę wersji raportu.").max(255),

  description: z.preprocess(normalizeOptionalText, z.string().optional()),
});

export const updateReportTemplateVersionSchema = z.object({
  reportTemplateVersionId: z.string().uuid(),

  version: z.string().trim().min(1, "Podaj oznaczenie wersji.").max(80),
  name: z.string().trim().min(1, "Podaj nazwę wersji raportu.").max(255),
  description: z.preprocess(normalizeOptionalText, z.string().optional()),

  status: reportTemplateVersionStatusSchema,
  isDefault: z.boolean(),

  globalCss: z.string().optional(),
  globalJs: z.string().optional(),

  pageSize: reportPageSizeSchema.default("A4"),
  orientation: reportOrientationSchema,

  /**
   * W administracji wersji przyjmujemy tekst,
   * bo formularz wysyła JSON jako textarea.
   * Parsowanie i walidację obiektu robimy w mutation,
   * żeby móc zwrócić czytelny komunikat błędu.
   */
  configText: z.string().default("{}"),
  dataBindingsText: z.string().default("{}"),
});

export const updatePersonalCompositeSourcesSchema = z.object({
  reportTemplateVersionId: z.string().uuid(),
  sources: z
    .array(
      z.object({
        slot: z.string().trim().min(1, "Podaj slot.").max(80),
        label: z.string().trim().min(1, "Podaj etykietę.").max(160),
        questionnaireId: z.string().uuid(),
        questionnaireCode: z.string().trim().min(1).max(120),
        questionnaireName: z.string().trim().min(1).max(255),
        required: z.boolean(),
      }),
    )
    .min(1, "Dodaj przynajmniej jeden wymagany kwestionariusz."),
});

export const publishReportTemplateVersionSchema = z.object({
  reportTemplateVersionId: z.string().uuid(),
});

export const archiveReportTemplateVersionSchema = z.object({
  reportTemplateVersionId: z.string().uuid(),
});

export type ReportTemplateStatus = z.infer<
  typeof reportTemplateStatusSchema
>;

export type ReportTemplateVersionStatus = z.infer<
  typeof reportTemplateVersionStatusSchema
>;

export type ReportPageSize = z.infer<typeof reportPageSizeSchema>;

export type ReportOrientation = z.infer<typeof reportOrientationSchema>;

export type CreateReportTemplateInput = z.infer<
  typeof createReportTemplateSchema
>;

export type UpdateReportTemplateInput = z.infer<
  typeof updateReportTemplateSchema
>;

export type ArchiveReportTemplateInput = z.infer<
  typeof archiveReportTemplateSchema
>;

export type CreateReportTemplateVersionInput = z.infer<
  typeof createReportTemplateVersionSchema
>;

export type UpdateReportTemplateVersionInput = z.infer<
  typeof updateReportTemplateVersionSchema
>;

export type PublishReportTemplateVersionInput = z.infer<
  typeof publishReportTemplateVersionSchema
>;

export type ArchiveReportTemplateVersionInput = z.infer<
  typeof archiveReportTemplateVersionSchema
>;

export type ReportTemplateKind = z.infer<typeof reportTemplateKindSchema>;