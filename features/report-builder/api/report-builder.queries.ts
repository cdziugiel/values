// features/report-builder/api/report-builder.queries.ts

import { and, asc, eq, isNull, ne } from "drizzle-orm";
import {
  questionnaireVersions,
  questionnaires,
  reportTemplatePages,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function getReportTemplateVersionEditor({
  reportTemplateVersionId,
}: {
  reportTemplateVersionId: string;
}) {
  const versionRows = await controlDb
    .select({
      id: reportTemplateVersions.id,
      reportTemplateId: reportTemplateVersions.reportTemplateId,
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
      reportTemplateKind: reportTemplates.kind,
      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,
      reportTemplateDescription: reportTemplates.description,
      reportTemplateStatus: reportTemplates.status,

      questionnaireId: questionnaires.id,
      questionnaireCode: questionnaires.code,
      questionnaireName: questionnaires.name,
      questionnaireDescription: questionnaires.description,

      questionnaireVersionName: questionnaireVersions.name,
      questionnaireVersionLabel: questionnaireVersions.version,
      questionnaireVersionStatus: questionnaireVersions.status,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .leftJoin(
      questionnaireVersions,
      eq(questionnaireVersions.id, reportTemplateVersions.questionnaireVersionId),
    )
    .leftJoin(
      questionnaires,
      eq(questionnaires.id, questionnaireVersions.questionnaireId),
    )
    .where(
      and(
        eq(reportTemplateVersions.id, reportTemplateVersionId),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .limit(1);

  const version = versionRows[0];

  if (!version) {
    return null;
  }

  const pages = await controlDb
    .select({
      id: reportTemplatePages.id,
      reportTemplateVersionId: reportTemplatePages.reportTemplateVersionId,

      code: reportTemplatePages.code,
      title: reportTemplatePages.title,
      description: reportTemplatePages.description,

      orderIndex: reportTemplatePages.orderIndex,

      html: reportTemplatePages.html,
      css: reportTemplatePages.css,
      js: reportTemplatePages.js,

      visibilityCondition: reportTemplatePages.visibilityCondition,
      componentBindings: reportTemplatePages.componentBindings,
      config: reportTemplatePages.config,

      createdAt: reportTemplatePages.createdAt,
      updatedAt: reportTemplatePages.updatedAt,
    })
    .from(reportTemplatePages)
    .where(
      and(
        eq(reportTemplatePages.reportTemplateVersionId, reportTemplateVersionId),
        isNull(reportTemplatePages.deletedAt),
      ),
    )
    .orderBy(asc(reportTemplatePages.orderIndex), asc(reportTemplatePages.title));


const questionnaireRows = await controlDb
  .select({
    id: questionnaires.id,
    code: questionnaires.code,
    name: questionnaires.name,
    status: questionnaires.status,
  })
  .from(questionnaires)
  .where(
    and(
      isNull(questionnaires.deletedAt),
      ne(questionnaires.status, "archived"),
    ),
  )
  .orderBy(asc(questionnaires.name));

  return {
    ...version,
    config: asRecord(version.config),
    dataBindings: asRecord(version.dataBindings),
    availableQuestionnaires: questionnaireRows,
    pages: pages.map((page) => ({
      ...page,
      visibilityCondition:
        page.visibilityCondition &&
          typeof page.visibilityCondition === "object" &&
          !Array.isArray(page.visibilityCondition)
          ? page.visibilityCondition
          : null,
      componentBindings: asArray(page.componentBindings),
      config: asRecord(page.config),
    })),
  };
}