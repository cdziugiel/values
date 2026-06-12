// features/comparison-reports/api/my-comparison-session.queries.ts

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  questionnaires,
  questionnaireVersions,
} from "@/drizzle/schema";

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
  questionnaireName: string;
  completedAt: string | null;
  label: string;
};

type QuestionnaireLookupRow = {
  questionnaireVersionId: string;
  questionnaireId: string;
  questionnaireName: string;
  questionnaireCode: string | null;
};

async function getQuestionnaireByVersionId({
  controlDb,
  questionnaireVersionIds,
}: {
  controlDb: typeof import("@/server/db/control-db").controlDb;
  questionnaireVersionIds: string[];
}) {
  const uniqueVersionIds = Array.from(
    new Set(questionnaireVersionIds.filter(Boolean)),
  );

  const questionnaireRows: QuestionnaireLookupRow[] =
    uniqueVersionIds.length > 0
      ? await controlDb
          .select({
            questionnaireVersionId: questionnaireVersions.id,
            questionnaireId: questionnaires.id,
            questionnaireName: questionnaires.name,
            questionnaireCode: questionnaires.code,
          })
          .from(questionnaireVersions)
          .innerJoin(
            questionnaires,
            eq(questionnaires.id, questionnaireVersions.questionnaireId),
          )
          .where(inArray(questionnaireVersions.id, uniqueVersionIds))
      : [];

  return new Map(
    questionnaireRows.map((row) => [
      row.questionnaireVersionId,
      {
        id: row.questionnaireId,
        name: row.questionnaireName,
        code: row.questionnaireCode,
      },
    ]),
  );
}

function normalizeCompletedAt(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ? String(value) : null;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pl-PL") : null;
}

export async function listMyCompletedComparisonQuestionnaires({
  tenantSlug = null,
  assessmentProjectId,
}: {
  tenantSlug?: string | null;
  assessmentProjectId?: string;
} = {}): Promise<MyComparisonQuestionnaireOption[]> {
  const session = await requireSession();

  if (!session.user?.id || !session.user?.email) {
    return [];
  }

  const runtime = await getMyAssessmentRuntime({
    userId: session.user.id,
    tenantSlug,
  });

  if (!runtime) {
    return [];
  }

  const normalizedEmail = session.user.email.trim().toLowerCase();

  const whereConditions = [
    eq(assessmentSessions.status, "completed"),
    sql`lower(${respondentIdentities.email}) = ${normalizedEmail}`,
    isNull(assessmentDimensionScores.deletedAt),
    isNull(assessmentSessions.deletedAt),
    isNull(assessmentProjects.deletedAt),
    isNull(respondents.deletedAt),
    isNull(respondentIdentities.deletedAt),
  ];

  if (assessmentProjectId) {
    whereConditions.push(
      eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
    );
  }

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
    .where(and(...whereConditions))
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

  const questionnaireByVersionId = await getQuestionnaireByVersionId({
    controlDb: runtime.controlDb,
    questionnaireVersionIds: rows.map((row) => row.questionnaireVersionId),
  });

  return rows.map((row) => {
    const completedAt = normalizeCompletedAt(row.completedAt);
    const questionnaire =
      questionnaireByVersionId.get(row.questionnaireVersionId) ?? null;

    const questionnaireName =
      questionnaire?.name ?? row.questionnaireVersionId;

    const completedDate = formatDate(completedAt);

    return {
      assessmentSessionId: row.assessmentSessionId,
      assessmentProjectId: row.assessmentProjectId,
      assessmentProjectName: row.assessmentProjectName,
      respondentId: row.respondentId,
      questionnaireId: row.questionnaireId,
      questionnaireVersionId: row.questionnaireVersionId,
      questionnaireName,
      completedAt,
      label: `${questionnaireName} — ${row.assessmentProjectName}${
        completedDate ? ` — ${completedDate}` : ""
      }`,
    };
  });
}

export async function listProjectCompletedComparisonQuestionnaires({
  tenantSlug,
  assessmentProjectId,
}: {
  tenantSlug: string;
  assessmentProjectId: string;
}): Promise<MyComparisonQuestionnaireOption[]> {
  const session = await requireSession();

  if (!session.user?.id) {
    return [];
  }

  const runtime = await getMyAssessmentRuntime({
    userId: session.user.id,
    tenantSlug,
  });

  if (!runtime) {
    return [];
  }

  const rows = await runtime.db
    .select({
      assessmentSessionId: assessmentSessions.id,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
      assessmentProjectName: assessmentProjects.name,
      respondentId: assessmentSessions.respondentId,
      completedAt: assessmentSessions.completedAt,
      questionnaireId: assessmentDimensionScores.questionnaireId,
      questionnaireVersionId: assessmentDimensionScores.questionnaireVersionId,
      respondentEmail: respondentIdentities.email,
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
        eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
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
      respondentIdentities.email,
    )
    .orderBy(desc(assessmentSessions.completedAt));

  const questionnaireByVersionId = await getQuestionnaireByVersionId({
    controlDb: runtime.controlDb,
    questionnaireVersionIds: rows.map((row) => row.questionnaireVersionId),
  });

  return rows.map((row) => {
    const completedAt = normalizeCompletedAt(row.completedAt);
    const questionnaire =
      questionnaireByVersionId.get(row.questionnaireVersionId) ?? null;

    const questionnaireName =
      questionnaire?.name ?? row.questionnaireVersionId;

    const completedDate = formatDate(completedAt);

    return {
      assessmentSessionId: row.assessmentSessionId,
      assessmentProjectId: row.assessmentProjectId,
      assessmentProjectName: row.assessmentProjectName,
      respondentId: row.respondentId,
      questionnaireId: row.questionnaireId,
      questionnaireVersionId: row.questionnaireVersionId,
      questionnaireName,
      completedAt,
      label: `${row.respondentEmail ?? "Respondent"} — ${questionnaireName}${
        completedDate ? ` — ${completedDate}` : ""
      }`,
    };
  });
}