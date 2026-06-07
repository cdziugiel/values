// features/comparison-reports/lib/resolve-my-session-comparison-scores.ts

// features/comparison-reports/lib/resolve-my-session-comparison-scores.ts

import { and, eq, isNull } from "drizzle-orm";

import {
  assessmentDimensionScores,
  assessmentSessions,
} from "@/drizzle/schema/tenant";
import { controlDb } from "@/server/db/control-db";

import type { ComparisonObjectResult } from "../types/comparison-report.types";
import { resolveQuestionnaireDimensionCategories } from "./resolve-questionnaire-dimension-categories";

type ResolveMySessionComparisonScoresInput = {
  db: any;
  controlDb: typeof controlDb;
  assessmentSessionId: string;
  questionnaireVersionId: string;
};

export async function resolveMySessionComparisonScores({
  db,
  controlDb,
  assessmentSessionId,
  questionnaireVersionId,
}: ResolveMySessionComparisonScoresInput): Promise<ComparisonObjectResult> {
  const [session] = await db
    .select({
      id: assessmentSessions.id,
      respondentId: assessmentSessions.respondentId,
      status: assessmentSessions.status,
    })
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.id, assessmentSessionId),
        isNull(assessmentSessions.deletedAt),
      ),
    )
    .limit(1);

  if (!session || session.status !== "completed") {
    return {
      type: "respondent",
      id: assessmentSessionId,
      label: "Mój wynik",
      n: 0,
      questionnaireId: null,
      questionnaireVersionId,
      visibility: {
        canShow: false,
        reason: "no_completed_sessions",
      },
      scores: [],
    };
  }

  const scores = await db
    .select({
      questionnaireId: assessmentDimensionScores.questionnaireId,
      questionnaireVersionId: assessmentDimensionScores.questionnaireVersionId,
      dimensionId: assessmentDimensionScores.questionnaireDimensionId,
      code: assessmentDimensionScores.dimensionCode,
      name: assessmentDimensionScores.dimensionName,
      score: assessmentDimensionScores.weightedMeanScore,
    })
    .from(assessmentDimensionScores)
    .where(
      and(
        eq(assessmentDimensionScores.assessmentSessionId, assessmentSessionId),
        eq(
          assessmentDimensionScores.questionnaireVersionId,
          questionnaireVersionId,
        ),
        isNull(assessmentDimensionScores.deletedAt),
      ),
    );

  const categoryByDimensionId = await resolveQuestionnaireDimensionCategories({
    controlDb,
    dimensionIds: scores.map((row: any) => row.dimensionId),
  });

  return {
    type: "respondent",
    id: session.respondentId,
    label: "Mój wynik",
    n: 1,
    questionnaireId: scores[0]?.questionnaireId ?? null,
    questionnaireVersionId:
      scores[0]?.questionnaireVersionId ?? questionnaireVersionId,
    visibility: {
      canShow: true,
    },
    scores: scores.map((row: any) => ({
      dimensionId: row.dimensionId,
      code: row.code,
      name: row.name,
      category: categoryByDimensionId.get(row.dimensionId) ?? null,
      score: row.score == null ? null : Number(row.score),
      respondentCount: 1,
    })),
  };
}