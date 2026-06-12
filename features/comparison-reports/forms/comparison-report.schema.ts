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

export type CreatePeerComparisonReportInput = z.infer<
  typeof createPeerComparisonReportInputSchema
>;

export const createProjectSessionComparisonReportInputSchema = z.object({
  tenantSlug: z.string().min(1),
  assessmentProjectId: z.string().uuid(),

  leftSessionId: z.string().uuid(),
  leftQuestionnaireVersionId: z.string().uuid(),

  rightSessionId: z.string().uuid(),
  rightQuestionnaireVersionId: z.string().uuid(),

  productId: z.string().uuid(),
  reportTemplateVersionId: z.string().uuid(),
});

export type CreateProjectSessionComparisonReportInput = z.infer<
  typeof createProjectSessionComparisonReportInputSchema
>;



function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();

  return normalized || undefined;
}

const optionalUuidString = z.preprocess(
  normalizeOptionalText,
  z.string().uuid().optional(),
);


export const createPeerComparisonReportInputSchema = z.object({
  tenantSlug: z.preprocess(
    normalizeOptionalText,
    z.string().min(1).optional(),
  ),

  assessmentProjectId: optionalUuidString,

  ownSessionId: z.string().uuid(),
  ownQuestionnaireVersionId: z.string().uuid(),

  otherToken: z.string().trim().min(24).max(256),

  productId: z.string().uuid(),
  reportTemplateVersionId: z.string().uuid(),
});



export  const projectComparisonSubjectTypeSchema = z.enum([
  "respondent",
  "team",
  "organization",
]);

export const projectComparisonSubjectInputSchema = z.object({
  subjectType: projectComparisonSubjectTypeSchema,
  subjectId: z.string().uuid(),
  assessmentSessionId: z.string().uuid().nullable().optional(),
  questionnaireVersionId: z.string().uuid(),
  label: z.string().min(1).max(240),
});

export const createProjectSubjectComparisonReportInputSchema = z.object({
  tenantSlug: z.string().min(1),
  assessmentProjectId: z.string().uuid(),

  left: projectComparisonSubjectInputSchema,
  right: projectComparisonSubjectInputSchema,

  productId: z.string().uuid(),
  reportTemplateVersionId: z.string().uuid(),
});

export type ProjectComparisonSubjectInput = z.infer<
  typeof projectComparisonSubjectInputSchema
>;