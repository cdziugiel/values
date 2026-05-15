// features/report-builder/forms/report-template.schema.ts

import { z } from "zod";

export const reportOrientationSchema = z.enum(["portrait", "landscape"]);

export const reportConditionOperatorSchema = z.enum([
  "exists",
  "not_exists",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "in",
]);

export const reportScoreMetricSchema = z.enum([
  "weightedMeanScore",
  "meanScore",
  "normalizedScore",
  "rawScore",
]);

export const reportIntersectionScoreMetricSchema = z.enum([
  "weightedMeanScore",
  "meanScore",
]);

export const reportConditionSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal("score"),
      category: z.string().min(1, "Podaj kategorię wymiaru."),
      code: z.string().min(1, "Podaj kod wymiaru."),
      metric: reportScoreMetricSchema.optional(),
      operator: reportConditionOperatorSchema,
      value: z.unknown().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      values: z.array(z.unknown()).optional(),
    }),

    z.object({
      type: z.literal("intersection_score"),
      filterCategory: z
        .string()
        .min(1, "Podaj kategorię wymiaru filtrującego."),
      filterCode: z.string().min(1, "Podaj kod wymiaru filtrującego."),
      targetCategory: z
        .string()
        .min(1, "Podaj kategorię wymiaru wynikowego."),
      targetCode: z.string().min(1, "Podaj kod wymiaru wynikowego."),
      metric: reportIntersectionScoreMetricSchema.optional(),
      operator: reportConditionOperatorSchema,
      value: z.unknown().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      values: z.array(z.unknown()).optional(),
    }),

    z.object({
      type: z.literal("and"),
      conditions: z.array(reportConditionSchema),
    }),

    z.object({
      type: z.literal("or"),
      conditions: z.array(reportConditionSchema),
    }),

    z.object({
      type: z.literal("not"),
      condition: reportConditionSchema,
    }),
  ]),
);

export const reportComponentBindingSchema = z.object({
  slot: z.string().min(1, "Podaj nazwę slotu."),
  component: z.string().min(1, "Podaj nazwę komponentu."),
  props: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Builder edytuje tylko ustawienia renderowania i treści wersji raportu.
 * Nie zarządza cyklem życia: tworzeniem, publikacją ani archiwizacją wersji.
 */
export const updateReportTemplateVersionBuilderSettingsSchema = z.object({
  reportTemplateVersionId: z.string().uuid(),

  name: z.string().min(1, "Podaj nazwę wersji raportu.").max(255),
  description: z.string().optional(),

  globalCss: z.string().optional(),
  globalJs: z.string().optional(),

  orientation: reportOrientationSchema,

  config: z.record(z.string(), z.unknown()).optional(),
  dataBindings: z.record(z.string(), z.unknown()).optional(),
});

export const createReportTemplatePageSchema = z.object({
  reportTemplateVersionId: z.string().uuid(),
  title: z.string().min(1, "Podaj tytuł strony.").max(255),
  description: z.string().optional(),
});

export const updateReportTemplatePageSchema = z.object({
  reportTemplatePageId: z.string().uuid(),

  code: z.string().min(1, "Podaj kod strony.").max(120),
  title: z.string().min(1, "Podaj tytuł strony.").max(255),
  description: z.string().optional(),

  html: z.string(),
  css: z.string(),
  js: z.string(),

  visibilityCondition: reportConditionSchema.nullable().optional(),
  componentBindings: z.array(reportComponentBindingSchema).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const reorderReportTemplatePageSchema = z.object({
  reportTemplatePageId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

export const archiveReportTemplatePageSchema = z.object({
  reportTemplatePageId: z.string().uuid(),
});

export type ReportOrientation = z.infer<typeof reportOrientationSchema>;

export type ReportConditionOperator = z.infer<
  typeof reportConditionOperatorSchema
>;

export type ReportCondition = z.infer<typeof reportConditionSchema>;

export type ReportComponentBinding = z.infer<
  typeof reportComponentBindingSchema
>;

export type UpdateReportTemplateVersionBuilderSettingsInput = z.infer<
  typeof updateReportTemplateVersionBuilderSettingsSchema
>;

export type CreateReportTemplatePageInput = z.infer<
  typeof createReportTemplatePageSchema
>;

export type UpdateReportTemplatePageInput = z.infer<
  typeof updateReportTemplatePageSchema
>;

export type ReorderReportTemplatePageInput = z.infer<
  typeof reorderReportTemplatePageSchema
>;

export type ArchiveReportTemplatePageInput = z.infer<
  typeof archiveReportTemplatePageSchema
>;