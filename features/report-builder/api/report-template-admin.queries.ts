// features/report-builder/api/report-template-admin.queries.ts

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import {
  questionnaireVersions,
  questionnaires,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export async function getReportTemplateListData() {
  const rows = await controlDb
    .select({
      reportTemplateId: reportTemplates.id,
      code: reportTemplates.code,
      name: reportTemplates.name,
      description: reportTemplates.description,
      status: reportTemplates.status,
      createdAt: reportTemplates.createdAt,
      updatedAt: reportTemplates.updatedAt,

      questionnaireId: questionnaires.id,
      questionnaireCode: questionnaires.code,
      questionnaireName: questionnaires.name,
    })
    .from(reportTemplates)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, reportTemplates.questionnaireId),
    )
    .where(
      and(
        isNull(reportTemplates.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    )
    .orderBy(asc(questionnaires.name), asc(reportTemplates.name));

  const versionRows = await controlDb
    .select({
      reportTemplateId: reportTemplateVersions.reportTemplateId,
      status: reportTemplateVersions.status,
    })
    .from(reportTemplateVersions)
    .where(isNull(reportTemplateVersions.deletedAt));

  const countsByTemplateId = new Map<
    string,
    {
      all: number;
      active: number;
      draft: number;
      archived: number;
    }
  >();

  for (const version of versionRows) {
    const current =
      countsByTemplateId.get(version.reportTemplateId) ?? {
        all: 0,
        active: 0,
        draft: 0,
        archived: 0,
      };

    current.all += 1;

    if (version.status === "active") current.active += 1;
    if (version.status === "draft") current.draft += 1;
    if (version.status === "archived") current.archived += 1;

    countsByTemplateId.set(version.reportTemplateId, current);
  }

  return rows.map((row) => ({
    ...row,
    versionsCount: countsByTemplateId.get(row.reportTemplateId)?.all ?? 0,
    activeVersionsCount:
      countsByTemplateId.get(row.reportTemplateId)?.active ?? 0,
    draftVersionsCount:
      countsByTemplateId.get(row.reportTemplateId)?.draft ?? 0,
    archivedVersionsCount:
      countsByTemplateId.get(row.reportTemplateId)?.archived ?? 0,
  }));
}

export async function getReportTemplateCreateData() {
  const questionnaireRows = await controlDb
    .select({
      id: questionnaires.id,
      code: questionnaires.code,
      name: questionnaires.name,
      status: questionnaires.status,
    })
    .from(questionnaires)
    .where(isNull(questionnaires.deletedAt))
    .orderBy(asc(questionnaires.name));

  return {
    questionnaires: questionnaireRows,
  };
}

export async function getReportTemplateDetailsData(reportTemplateId: string) {
  const templateRows = await controlDb
    .select({
      id: reportTemplates.id,
      questionnaireId: reportTemplates.questionnaireId,
      code: reportTemplates.code,
      name: reportTemplates.name,
      description: reportTemplates.description,
      status: reportTemplates.status,
      createdAt: reportTemplates.createdAt,
      updatedAt: reportTemplates.updatedAt,

      questionnaireCode: questionnaires.code,
      questionnaireName: questionnaires.name,
    })
    .from(reportTemplates)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, reportTemplates.questionnaireId),
    )
    .where(
      and(
        eq(reportTemplates.id, reportTemplateId),
        isNull(reportTemplates.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    )
    .limit(1);

  const template = templateRows[0];

  if (!template) {
    return null;
  }

  const versions = await controlDb
    .select({
      id: reportTemplateVersions.id,
      reportTemplateId: reportTemplateVersions.reportTemplateId,
      questionnaireVersionId: reportTemplateVersions.questionnaireVersionId,
      version: reportTemplateVersions.version,
      name: reportTemplateVersions.name,
      description: reportTemplateVersions.description,
      status: reportTemplateVersions.status,
      isDefault: reportTemplateVersions.isDefault,
      pageSize: reportTemplateVersions.pageSize,
      orientation: reportTemplateVersions.orientation,
      createdAt: reportTemplateVersions.createdAt,
      updatedAt: reportTemplateVersions.updatedAt,

      questionnaireVersion: questionnaireVersions.version,
      questionnaireVersionName: questionnaireVersions.name,
      questionnaireVersionStatus: questionnaireVersions.status,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      questionnaireVersions,
      eq(questionnaireVersions.id, reportTemplateVersions.questionnaireVersionId),
    )
    .where(
      and(
        eq(reportTemplateVersions.reportTemplateId, reportTemplateId),
        isNull(reportTemplateVersions.deletedAt),
        isNull(questionnaireVersions.deletedAt),
      ),
    )
    .orderBy(desc(reportTemplateVersions.updatedAt));

  const availableQuestionnaireVersions = await controlDb
    .select({
      id: questionnaireVersions.id,
      version: questionnaireVersions.version,
      name: questionnaireVersions.name,
      status: questionnaireVersions.status,
    })
    .from(questionnaireVersions)
    .where(
      and(
        eq(questionnaireVersions.questionnaireId, template.questionnaireId),
        isNull(questionnaireVersions.deletedAt),
      ),
    )
    .orderBy(desc(questionnaireVersions.updatedAt));

  return {
    template,
    versions,
    availableQuestionnaireVersions,
  };
}

export async function getReportTemplateVersionEditorData({
  reportTemplateId,
  reportTemplateVersionId,
}: {
  reportTemplateId: string;
  reportTemplateVersionId: string;
}) {
  const rows = await controlDb
    .select({
      reportTemplateId: reportTemplates.id,
      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,
      questionnaireId: reportTemplates.questionnaireId,

      reportTemplateVersionId: reportTemplateVersions.id,
      questionnaireVersionId: reportTemplateVersions.questionnaireVersionId,
      version: reportTemplateVersions.version,
      name: reportTemplateVersions.name,
      description: reportTemplateVersions.description,
      status: reportTemplateVersions.status,
      isDefault: reportTemplateVersions.isDefault,
      globalCss: reportTemplateVersions.globalCss,
      globalJs: reportTemplateVersions.globalJs,
      pageSize: reportTemplateVersions.pageSize,
      orientation: reportTemplateVersions.orientation,
      config: reportTemplateVersions.config,
      dataBindings: reportTemplateVersions.dataBindings,
      createdAt: reportTemplateVersions.createdAt,
      updatedAt: reportTemplateVersions.updatedAt,

      questionnaireVersion: questionnaireVersions.version,
      questionnaireVersionName: questionnaireVersions.name,
      questionnaireVersionStatus: questionnaireVersions.status,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .innerJoin(
      questionnaireVersions,
      eq(questionnaireVersions.id, reportTemplateVersions.questionnaireVersionId),
    )
    .where(
      and(
        eq(reportTemplates.id, reportTemplateId),
        eq(reportTemplateVersions.id, reportTemplateVersionId),
        isNull(reportTemplates.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
        isNull(questionnaireVersions.deletedAt),
      ),
    )
    .limit(1);

  const version = rows[0];

  if (!version) {
    return null;
  }

  return {
    version,
  };
}