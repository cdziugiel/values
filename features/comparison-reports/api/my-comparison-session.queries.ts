// features/comparison-reports/api/my-comparison-session.queries.ts

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import {
  assessmentDimensionScores,
  assessmentProjects,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant";
import { getMyAssessmentRuntime } from "@/features/my-assessment/api/my-assessment-runtime";
import { requireSession } from "@/server/auth/require-session";

export type MyComparisonQuestionnaireOption = {
  assessmentSessionId: string;
  assessmentProjectId: string;
  assessmentProjectName: string;
  respondentId: string;
  questionnaireId: string;
  questionnaireVersionId: string;
  completedAt: string | null;
  label: string;
};

export async function listMyCompletedComparisonQuestionnaires(): Promise<
  MyComparisonQuestionnaireOption[]
> {
  const session = await requireSession();

  if (!session.user?.id || !session.user?.email) {
    return [];
  }

  const runtime = await getMyAssessmentRuntime({
    userId: session.user.id,
  });

  if (!runtime) {
    return [];
  }

  const normalizedEmail = session.user.email.trim().toLowerCase();

  const rows = await runtime.db
    .select({
      assessmentSessionId: assessmentSessions.id,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
      assessmentProjectName: assessmentProjects.name,
      respondentId: assessmentSessions.respondentId,
      completedAt: assessmentSessions.completedAt,
      questionnaireId: assessmentDimensionScores.questionnaireId,
      questionnaireVersionId: assessmentDimensionScores.questionnaireVersionId,
    })
    .from(assessmentDimensionScores)
    .innerJoin(
      assessmentSessions,
      eq(assessmentSessions.id, assessmentDimensionScores.assessmentSessionId),
    )
    .innerJoin(
      assessmentProjects,
      eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
    )
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentSessions.respondentId),
    )
    .innerJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, respondents.id),
    )
    .where(
      and(
        eq(assessmentSessions.status, "completed"),
        sql`lower(${respondentIdentities.email}) = ${normalizedEmail}`,
        isNull(assessmentDimensionScores.deletedAt),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(respondents.deletedAt),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .groupBy(
      assessmentSessions.id,
      assessmentSessions.assessmentProjectId,
      assessmentProjects.name,
      assessmentSessions.respondentId,
      assessmentSessions.completedAt,
      assessmentDimensionScores.questionnaireId,
      assessmentDimensionScores.questionnaireVersionId,
    )
    .orderBy(desc(assessmentSessions.completedAt));

  return rows.map((row) => {
    const completedAt =
      row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : row.completedAt
          ? String(row.completedAt)
          : null;

    return {
      assessmentSessionId: row.assessmentSessionId,
      assessmentProjectId: row.assessmentProjectId,
      assessmentProjectName: row.assessmentProjectName,
      respondentId: row.respondentId,
      questionnaireId: row.questionnaireId,
      questionnaireVersionId: row.questionnaireVersionId,
      completedAt,
      label: `${row.assessmentProjectName}${
        completedAt
          ? ` — ${new Date(completedAt).toLocaleDateString("pl-PL")}`
          : ""
      }`,
    };
  });
}