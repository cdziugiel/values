import { and, asc, eq, isNull } from "drizzle-orm";

import {
  questionnaireItems,
  questionnairePages,
  questionnaires,
  questionnaireVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export type QuestionnairePreviewItem = {
  id: string;
  code: string;
  type: string;
  text: string;
  helpText: string | null;
  required: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  options: unknown;
  responseConfig: unknown;
  orderIndex: number;
};

export type QuestionnairePreviewPage = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  orderIndex: number;
  items: QuestionnairePreviewItem[];
};

export type QuestionnairePreviewData = {
  questionnaire: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    status: string;
  };
  version: {
    id: string;
    version: string;
    name: string;
    description: string | null;
    status: string;
    isPublic: boolean;
    updatedAt: Date;
  };
  pages: QuestionnairePreviewPage[];
  unpagedItems: QuestionnairePreviewItem[];
};

export async function getQuestionnairePreviewData(
  versionId: string,
): Promise<QuestionnairePreviewData | null> {
  const versionRows = await controlDb
    .select({
      questionnaireId: questionnaires.id,
      questionnaireCode: questionnaires.code,
      questionnaireName: questionnaires.name,
      questionnaireDescription: questionnaires.description,
      questionnaireStatus: questionnaires.status,

      versionId: questionnaireVersions.id,
      version: questionnaireVersions.version,
      versionName: questionnaireVersions.name,
      versionDescription: questionnaireVersions.description,
      versionStatus: questionnaireVersions.status,
      versionIsPublic: questionnaireVersions.isPublic,
      versionUpdatedAt: questionnaireVersions.updatedAt,
    })
    .from(questionnaireVersions)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, questionnaireVersions.questionnaireId),
    )
    .where(
      and(
        eq(questionnaireVersions.id, versionId),
        isNull(questionnaireVersions.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    )
    .limit(1);

  const versionRow = versionRows[0];

  if (!versionRow) {
    return null;
  }

  const pageRows = await controlDb
    .select({
      id: questionnairePages.id,
      code: questionnairePages.code,
      title: questionnairePages.title,
      description: questionnairePages.description,
      orderIndex: questionnairePages.orderIndex,
    })
    .from(questionnairePages)
    .where(
      and(
        eq(questionnairePages.questionnaireVersionId, versionId),
        isNull(questionnairePages.deletedAt),
      ),
    )
    .orderBy(asc(questionnairePages.orderIndex));

  const itemRows = await controlDb
    .select({
      id: questionnaireItems.id,
      questionnairePageId: questionnaireItems.questionnairePageId,
      code: questionnaireItems.code,
      type: questionnaireItems.type,
      text: questionnaireItems.text,
      helpText: questionnaireItems.helpText,
      required: questionnaireItems.required,
      scaleMin: questionnaireItems.scaleMin,
      scaleMax: questionnaireItems.scaleMax,
      scaleMinLabel: questionnaireItems.scaleMinLabel,
      scaleMaxLabel: questionnaireItems.scaleMaxLabel,
      options: questionnaireItems.options,
      responseConfig: questionnaireItems.responseConfig,
      orderIndex: questionnaireItems.orderIndex,
    })
    .from(questionnaireItems)
    .where(
      and(
        eq(questionnaireItems.questionnaireVersionId, versionId),
        isNull(questionnaireItems.deletedAt),
      ),
    )
    .orderBy(asc(questionnaireItems.orderIndex));

  const itemsByPageId = new Map<string, QuestionnairePreviewItem[]>();
  const unpagedItems: QuestionnairePreviewItem[] = [];

  for (const item of itemRows) {
    const normalizedItem: QuestionnairePreviewItem = {
      id: item.id,
      code: item.code,
      type: item.type,
      text: item.text,
      helpText: item.helpText,
      required: item.required,
      scaleMin: item.scaleMin,
      scaleMax: item.scaleMax,
      scaleMinLabel: item.scaleMinLabel,
      scaleMaxLabel: item.scaleMaxLabel,
      options: item.options,
      responseConfig: item.responseConfig,
      orderIndex: item.orderIndex,
    };

    if (!item.questionnairePageId) {
      unpagedItems.push(normalizedItem);
      continue;
    }

    const list = itemsByPageId.get(item.questionnairePageId) ?? [];
    list.push(normalizedItem);
    itemsByPageId.set(item.questionnairePageId, list);
  }

  return {
    questionnaire: {
      id: versionRow.questionnaireId,
      code: versionRow.questionnaireCode,
      name: versionRow.questionnaireName,
      description: versionRow.questionnaireDescription,
      status: versionRow.questionnaireStatus,
    },
    version: {
      id: versionRow.versionId,
      version: versionRow.version,
      name: versionRow.versionName,
      description: versionRow.versionDescription,
      status: versionRow.versionStatus,
      isPublic: versionRow.versionIsPublic,
      updatedAt: versionRow.versionUpdatedAt,
    },
    pages: pageRows.map((page) => ({
      ...page,
      items: itemsByPageId.get(page.id) ?? [],
    })),
    unpagedItems,
  };
}