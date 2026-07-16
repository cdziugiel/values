import { and, asc, eq, isNull } from "drizzle-orm";

import {
  questionnaireDimensions,
  questionnaireReportTemplateBindings,
  questionnaires,
  questionnaireVersions,
  reportTemplateVersions,
} from "@/drizzle/schema";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";

export type ReportPreviewDimensionOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  categoryLabel: string;
  orderIndex: number;
};

export type ReportPreviewDimensionCategory = {
  key: string;
  label: string;
  dimensions: ReportPreviewDimensionOption[];
};

export type ReportPreviewDefinition = {
  reportTemplateVersionId: string;
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
  questionnaireVersion: string;
  categories: ReportPreviewDimensionCategory[];
};

function categoryKey(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || "__NO_CATEGORY__";
}

function categoryLabel(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || "Bez kategorii";
}

export async function getReportPreviewDefinition(input: {
  reportTemplateVersionId: string;
}): Promise<ReportPreviewDefinition | null> {
  await requireSuperAdmin();

  const [binding] = await controlDb
    .select({
      questionnaireVersionId:
        questionnaireReportTemplateBindings.questionnaireVersionId,
    })
    .from(questionnaireReportTemplateBindings)
    .innerJoin(
      reportTemplateVersions,
      eq(
        reportTemplateVersions.id,
        questionnaireReportTemplateBindings.reportTemplateVersionId,
      ),
    )
    .where(
      and(
        eq(
          questionnaireReportTemplateBindings.reportTemplateVersionId,
          input.reportTemplateVersionId,
        ),
        eq(questionnaireReportTemplateBindings.status, "active"),
        isNull(questionnaireReportTemplateBindings.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
      ),
    )
    .limit(1);

  const questionnaireVersionId =
    binding?.questionnaireVersionId ?? null;

  if (!questionnaireVersionId) {
    return null;
  }

  const questionnaireRows = await controlDb
    .select({
      questionnaireId: questionnaires.id,
      questionnaireName: questionnaires.name,
      questionnaireVersionId: questionnaireVersions.id,
      questionnaireVersionName: questionnaireVersions.name,
      questionnaireVersion: questionnaireVersions.version,
    })
    .from(questionnaireVersions)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, questionnaireVersions.questionnaireId),
    )
    .where(
      and(
        eq(questionnaireVersions.id, questionnaireVersionId),
        isNull(questionnaireVersions.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    )
    .limit(1);

  const questionnaire = questionnaireRows[0];

  if (!questionnaire) {
    return null;
  }

  const dimensions = await controlDb
    .select({
      id: questionnaireDimensions.id,
      code: questionnaireDimensions.code,
      name: questionnaireDimensions.name,
      description: questionnaireDimensions.description,
      category: questionnaireDimensions.category,
      orderIndex: questionnaireDimensions.orderIndex,
    })
    .from(questionnaireDimensions)
    .where(
      and(
        eq(
          questionnaireDimensions.questionnaireVersionId,
          questionnaireVersionId,
        ),
        isNull(questionnaireDimensions.deletedAt),
      ),
    )
    .orderBy(
      asc(questionnaireDimensions.category),
      asc(questionnaireDimensions.orderIndex),
      asc(questionnaireDimensions.name),
    );

  const grouped = new Map<string, ReportPreviewDimensionCategory>();

  for (const dimension of dimensions) {
    const key = categoryKey(dimension.category);

    const group = grouped.get(key) ?? {
      key,
      label: categoryLabel(dimension.category),
      dimensions: [],
    };

    group.dimensions.push({
      id: dimension.id,
      code: dimension.code.trim().toUpperCase(),
      name: dimension.name,
      description: dimension.description,
      category: key,
      categoryLabel: categoryLabel(dimension.category),
      orderIndex: dimension.orderIndex,
    });

    grouped.set(key, group);
  }

  return {
    reportTemplateVersionId: input.reportTemplateVersionId,
    questionnaireId: questionnaire.questionnaireId,
    questionnaireVersionId:
      questionnaire.questionnaireVersionId,
    questionnaireName: questionnaire.questionnaireName,
    questionnaireVersionName:
      questionnaire.questionnaireVersionName,
    questionnaireVersion: questionnaire.questionnaireVersion,
    categories: Array.from(grouped.values()),
  };
}
