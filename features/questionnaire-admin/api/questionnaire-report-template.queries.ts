import { and, desc, eq, isNull } from "drizzle-orm";

import {
  questionnaireReportTemplateBindings,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";

export async function getQuestionnaireReportTemplateAdminData({
  questionnaireVersionId,
}: {
  questionnaireVersionId: string;
}) {
  const activeBindingRows = await controlDb
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
        eq(
          questionnaireReportTemplateBindings.questionnaireVersionId,
          questionnaireVersionId,
        ),
        eq(questionnaireReportTemplateBindings.isDefault, true),
        eq(questionnaireReportTemplateBindings.status, "active"),
        isNull(questionnaireReportTemplateBindings.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .limit(1);

  const activeBinding = activeBindingRows[0] ?? null;

  const availableTemplateVersions = await controlDb
    .select({
      reportTemplateId: reportTemplates.id,
      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,

      reportTemplateVersionId: reportTemplateVersions.id,
      reportTemplateVersion: reportTemplateVersions.version,
      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersionStatus: reportTemplateVersions.status,
      updatedAt: reportTemplateVersions.updatedAt,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .where(
      and(
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .orderBy(desc(reportTemplateVersions.updatedAt));

  return {
    activeBinding,
    availableTemplateVersions,
  };
}