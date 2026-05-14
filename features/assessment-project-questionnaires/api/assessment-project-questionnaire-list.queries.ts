import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaires,
  questionnaireVersions,
} from "@/drizzle/schema";
import {
  assessmentProjectQuestionnaires,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import type { TenantDb } from "@/server/db/tenant-db";

export type AssessmentProjectQuestionnaireAssignment = {
  id: string;
  assessmentProjectId: string;
  questionnaireId: string;
  questionnaireVersionId: string;
  orderIndex: number;
  status: string;
  questionnaireCode: string;
  questionnaireName: string;
  questionnaireVersion: string;
  questionnaireVersionName: string;
};

export async function listAssessmentProjectQuestionnaireAssignments({
  db,
  assessmentProjectIds,
}: {
  db: TenantDb;
  assessmentProjectIds: string[];
}): Promise<AssessmentProjectQuestionnaireAssignment[]> {
  if (assessmentProjectIds.length === 0) {
    return [];
  }

  const assignmentRows = await db
    .select({
      id: assessmentProjectQuestionnaires.id,
      assessmentProjectId: assessmentProjectQuestionnaires.assessmentProjectId,
      questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
      orderIndex: assessmentProjectQuestionnaires.orderIndex,
      status: assessmentProjectQuestionnaires.status,
    })
    .from(assessmentProjectQuestionnaires)
    .where(
      and(
        inArray(
          assessmentProjectQuestionnaires.assessmentProjectId,
          assessmentProjectIds,
        ),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    )
    .orderBy(
      asc(assessmentProjectQuestionnaires.assessmentProjectId),
      asc(assessmentProjectQuestionnaires.orderIndex),
    );

  if (assignmentRows.length === 0) {
    return [];
  }

  const versionIds = Array.from(
    new Set(assignmentRows.map((row) => row.questionnaireVersionId)),
  );

  const versionRows = await controlDb
    .select({
      questionnaireId: questionnaires.id,
      questionnaireCode: questionnaires.code,
      questionnaireName: questionnaires.name,
      questionnaireVersionId: questionnaireVersions.id,
      questionnaireVersion: questionnaireVersions.version,
      questionnaireVersionName: questionnaireVersions.name,
    })
    .from(questionnaireVersions)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, questionnaireVersions.questionnaireId),
    )
    .where(
      and(
        inArray(questionnaireVersions.id, versionIds),
        isNull(questionnaireVersions.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    );

  const versionById = new Map(
    versionRows.map((version) => [version.questionnaireVersionId, version]),
  );

  return assignmentRows.map((assignment) => {
    const version = versionById.get(assignment.questionnaireVersionId);

    return {
      id: assignment.id,
      assessmentProjectId: assignment.assessmentProjectId,
      questionnaireId: assignment.questionnaireId,
      questionnaireVersionId: assignment.questionnaireVersionId,
      orderIndex: assignment.orderIndex,
      status: assignment.status,
      questionnaireCode: version?.questionnaireCode ?? "—",
      questionnaireName: version?.questionnaireName ?? "Nieznany kwestionariusz",
      questionnaireVersion: version?.questionnaireVersion ?? "—",
      questionnaireVersionName: version?.questionnaireVersionName ?? "—",
    };
  });
}