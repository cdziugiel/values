import { and, eq, isNull } from "drizzle-orm";

import {
  questionnaireDimensions,
  questionnaireItems,
  questionnairePages,
  questionnaireVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export async function assertQuestionnaireVersionIsDraft(versionId: string) {
  const version = await controlDb.query.questionnaireVersions.findFirst({
    where: and(
      eq(questionnaireVersions.id, versionId),
      isNull(questionnaireVersions.deletedAt),
    ),
    columns: {
      id: true,
      status: true,
    },
  });

  if (!version) {
    throw new Error("Nie znaleziono wersji kwestionariusza.");
  }

  if (version.status !== "draft") {
    throw new Error(
      "Tę operację można wykonać tylko na wersji roboczej. Opublikowane i archiwalne wersje są tylko do odczytu.",
    );
  }

  return version;
}

export async function assertQuestionnairePageVersionIsDraft(pageId: string) {
  const page = await controlDb.query.questionnairePages.findFirst({
    where: and(
      eq(questionnairePages.id, pageId),
      isNull(questionnairePages.deletedAt),
    ),
    columns: {
      id: true,
      questionnaireVersionId: true,
    },
  });

  if (!page) {
    throw new Error("Nie znaleziono strony kwestionariusza.");
  }

  await assertQuestionnaireVersionIsDraft(page.questionnaireVersionId);

  return page;
}

export async function assertQuestionnaireItemVersionIsDraft(itemId: string) {
  const item = await controlDb.query.questionnaireItems.findFirst({
    where: and(
      eq(questionnaireItems.id, itemId),
      isNull(questionnaireItems.deletedAt),
    ),
    columns: {
      id: true,
      questionnaireVersionId: true,
    },
  });

  if (!item) {
    throw new Error("Nie znaleziono itemu kwestionariusza.");
  }

  await assertQuestionnaireVersionIsDraft(item.questionnaireVersionId);

  return item;
}

export async function assertQuestionnaireDimensionVersionIsDraft(
  dimensionId: string,
) {
  const dimension = await controlDb.query.questionnaireDimensions.findFirst({
    where: and(
      eq(questionnaireDimensions.id, dimensionId),
      isNull(questionnaireDimensions.deletedAt),
    ),
    columns: {
      id: true,
      questionnaireVersionId: true,
    },
  });

  if (!dimension) {
    throw new Error("Nie znaleziono wymiaru kwestionariusza.");
  }

  await assertQuestionnaireVersionIsDraft(dimension.questionnaireVersionId);

  return dimension;
}