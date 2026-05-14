import { and, asc, eq, isNull } from "drizzle-orm";

import {
  questionnaires,
  questionnaireVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import type { ActiveQuestionnaireVersionOption } from "../types/questionnaire.types";

export async function listActiveQuestionnaireVersions(): Promise<
  ActiveQuestionnaireVersionOption[]
> {
  return controlDb
    .select({
      questionnaireId: questionnaires.id,
      questionnaireCode: questionnaires.code,
      questionnaireName: questionnaires.name,
      questionnaireVersionId: questionnaireVersions.id,
      version: questionnaireVersions.version,
      versionName: questionnaireVersions.name,
    })
    .from(questionnaireVersions)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, questionnaireVersions.questionnaireId),
    )
    .where(
      and(
        eq(questionnaires.status, "active"),
        eq(questionnaireVersions.status, "active"),
        isNull(questionnaires.deletedAt),
        isNull(questionnaireVersions.deletedAt),
      ),
    )
    .orderBy(asc(questionnaires.name), asc(questionnaireVersions.version));
}