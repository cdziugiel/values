// features/comparison-reports/lib/build-comparison-report-data.ts
import { assertMyAssessmentSessionAccess } from "@/features/my-assessment/api/assert-my-assessment-session-access";
import type { TenantAuditActorContext } from "@/server/audit/write-tenant-audit-log";

import { buildComparisonDeltaRows } from "./comparison-deltas";
import { resolveComparisonToken } from "./resolve-comparison-token";
import { resolveMySessionComparisonScores } from "./resolve-my-session-comparison-scores";

import { controlDb } from "@/server/db/control-db";

type BuildPeerComparisonReportDataInput = {
  db: any;
  controlDb: typeof controlDb;
  ctx: TenantAuditActorContext;
  userEmail: string;
  ownSessionId: string;
  ownQuestionnaireVersionId: string;
  otherToken: string;
};
export async function buildPeerComparisonReportData({
  db,
  controlDb,
  ctx,
  userEmail,
  ownSessionId,
  ownQuestionnaireVersionId,
  otherToken,
}: BuildPeerComparisonReportDataInput) {
  await assertMyAssessmentSessionAccess({
    db,
    userEmail,
    assessmentSessionId: ownSessionId,
  });

const left = await resolveMySessionComparisonScores({
  db,
  controlDb,
  assessmentSessionId: ownSessionId,
  questionnaireVersionId: ownQuestionnaireVersionId,
});

const right = await resolveComparisonToken({
  db,
  controlDb,
  ctx,
  token: otherToken,
});

  const leftQuestionnaireId = left.questionnaireId ?? null;
  const rightQuestionnaireId = right.questionnaireId ?? null;

  if (
    !leftQuestionnaireId ||
    !rightQuestionnaireId ||
    leftQuestionnaireId !== rightQuestionnaireId
  ) {
    return {
      mode: "peer" as const,
      left,
      right,
      rows: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        minGroupSize: 1,
        warnings: [
          "Nie można porównać wyników z różnych kwestionariuszy. Wybierz wynik tego samego kwestionariusza albo użyj tokenu wygenerowanego dla tego samego narzędzia.",
        ],
        comparisonBlockedReason: "different_questionnaire" as const,
      },
    };
  }

  const rows = buildComparisonDeltaRows({
    leftScores: left.scores,
    rightScores: right.scores,
  });

  return {
    mode: "peer" as const,
    left,
    right,
    rows,
    metadata: {
      generatedAt: new Date().toISOString(),
      minGroupSize: 1,
      warnings:
        left.questionnaireVersionId &&
        right.questionnaireVersionId &&
        left.questionnaireVersionId !== right.questionnaireVersionId
          ? [
              "Porównujesz wyniki tego samego kwestionariusza, ale z różnych wersji. Interpretuj różnice ostrożnie.",
            ]
          : [],
    },
  };
}