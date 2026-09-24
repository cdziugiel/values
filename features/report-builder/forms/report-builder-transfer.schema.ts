// HUMANET installer: report-builder-full-transfer-v1
import { z } from "zod";

import { reportOrientationSchema } from "./report-template.schema";

export const REPORT_BUILDER_TRANSFER_FORMAT = "humanet.report-builder";
export const REPORT_BUILDER_TRANSFER_VERSION = 1 as const;

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const reportBuilderTransferPageSchema = z.object({
  code: z.string().trim().min(1, "Strona musi mieć kod.").max(120),
  title: z.string().trim().min(1, "Strona musi mieć tytuł.").max(255),
  description: z.string().nullable(),
  technicalDescription: z.string().nullable(),
  orderIndex: z.number().int().positive(),
  html: z.string(),
  css: z.string(),
  js: z.string(),
  visibilityCondition: z.unknown().nullable(),
  componentBindings: z.array(z.unknown()),
  config: jsonRecordSchema,
});

export const reportBuilderTransferPackageSchema = z
  .object({
    format: z.literal(REPORT_BUILDER_TRANSFER_FORMAT),
    formatVersion: z.literal(REPORT_BUILDER_TRANSFER_VERSION),
    exportedAt: z.string().datetime(),
    source: z.object({
      reportTemplate: z.object({
        code: z.string(),
        name: z.string(),
        kind: z.string(),
      }),
      reportTemplateVersion: z.object({
        version: z.string(),
        name: z.string(),
        status: z.string(),
      }),
      questionnaire: z
        .object({
          code: z.string().nullable(),
          name: z.string().nullable(),
          version: z.string().nullable(),
        })
        .nullable(),
    }),
    layout: z.object({
      pageSize: z.string().min(1).max(20),
      orientation: reportOrientationSchema,
    }),
    global: z.object({
      css: z.string(),
      js: z.string(),
      config: jsonRecordSchema,
      dataBindings: jsonRecordSchema,
    }),
    pages: z.array(reportBuilderTransferPageSchema).max(500),
  })
  .superRefine((value, ctx) => {
    const codes = new Set<string>();
    const orders = new Set<number>();

    value.pages.forEach((page, index) => {
      const normalizedCode = page.code
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");

      if (codes.has(normalizedCode)) {
        ctx.addIssue({
          code: "custom",
          path: ["pages", index, "code"],
          message: `Powtórzony kod strony po normalizacji: ${normalizedCode}.`,
        });
      }

      if (orders.has(page.orderIndex)) {
        ctx.addIssue({
          code: "custom",
          path: ["pages", index, "orderIndex"],
          message: `Powtórzona kolejność strony: ${page.orderIndex}.`,
        });
      }

      codes.add(normalizedCode);
      orders.add(page.orderIndex);
    });
  });

export type ReportBuilderTransferPackage = z.infer<
  typeof reportBuilderTransferPackageSchema
>;
