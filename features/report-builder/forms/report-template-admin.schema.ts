// features/report-builder/forms/report-template-admin.schema.ts

import { z } from "zod";

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

export const createReportTemplateSchema = z.object({
  questionnaireId: z.string().uuid(),
  code: z
    .string()
    .min(1, "Podaj kod template’u.")
    .max(120)
    .transform(normalizeCode),
  name: z.string().trim().min(1, "Podaj nazwę template’u.").max(255),
  description: z.preprocess(normalizeOptionalText, z.string().optional()),
});

export const updateReportTemplateSchema = z.object({
  reportTemplateId: z.string().uuid(),
  code: z
    .string()
    .min(1, "Podaj kod template’u.")
    .max(120)
    .transform(normalizeCode),
  name: z.string().trim().min(1, "Podaj nazwę template’u.").max(255),
  description: z.preprocess(normalizeOptionalText, z.string().optional()),
  status: reportTemplateStatusSchema,
});

export const archiveReportTemplateSchema = z.object({
  reportTemplateId: z.string().uuid(),
});

export const createReportTemplateVersionSchema = z.object({
  reportTemplateId: z.string().uuid(),
  questionnaireVersionId: z.string().uuid(),
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