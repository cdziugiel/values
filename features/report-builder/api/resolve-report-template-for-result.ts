// features/report-builder/api/resolve-report-template-for-result.ts

import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireReportTemplateBindings,
  reportTemplateVersions,
  reportTemplates,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";

export async function resolveReportTemplateForAssessmentPayload(payload: any) {
  const questionnaireVersionIds = Array.isArray(payload?.questionnaires)
    ? payload.questionnaires
        .map((questionnaire: any) => questionnaire.questionnaireVersionId)
        .filter(Boolean)
    : [];

  if (questionnaireVersionIds.length === 0) {
    return null;
  }

  const rows = await controlDb
    .select({
      bindingId: questionnaireReportTemplateBindings.id,

      reportTemplateId: reportTemplates.id,
      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,

      reportTemplateVersionId: reportTemplateVersions.id,
      reportTemplateVersion: reportTemplateVersions.version,
      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersionStatus: reportTemplateVersions.status,
    })
    .from(questionnaireReportTemplateBindings)
    .innerJoin(
      reportTemplateVersions,
      eq(
        reportTemplateVersions.id,
        questionnaireReportTemplateBindings.reportTemplateVersionId,
      ),
    )
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .where(
      and(
        inArray(
          questionnaireReportTemplateBindings.questionnaireVersionId,
          questionnaireVersionIds,
        ),
        eq(questionnaireReportTemplateBindings.isDefault, true),
        eq(questionnaireReportTemplateBindings.status, "active"),
        eq(reportTemplateVersions.status, "active"),
        eq(reportTemplates.status, "active"),
        isNull(questionnaireReportTemplateBindings.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}