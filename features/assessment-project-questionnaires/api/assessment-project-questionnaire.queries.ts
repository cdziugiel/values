import { and, asc, eq, isNull } from "drizzle-orm";

import { assessmentProjectQuestionnaires } from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";

import type { AssessmentProjectQuestionnaireListItem } from "../types/assessment-project-questionnaire.types";

export async function listAssessmentProjectQuestionnaires({
  db,
  assessmentProjectId,
}: {
  db: TenantDb;
  assessmentProjectId: string;
}): Promise<AssessmentProjectQuestionnaireListItem[]> {
  return db
    .select({
      id: assessmentProjectQuestionnaires.id,
      assessmentProjectId: assessmentProjectQuestionnaires.assessmentProjectId,
      questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
      orderIndex: assessmentProjectQuestionnaires.orderIndex,
      status: assessmentProjectQuestionnaires.status,
      createdAt: assessmentProjectQuestionnaires.createdAt,
    })
    .from(assessmentProjectQuestionnaires)
    .where(
      and(
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          assessmentProjectId,
        ),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    )
    .orderBy(asc(assessmentProjectQuestionnaires.orderIndex));
}