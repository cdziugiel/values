// features/comparison-reports/lib/resolve-comparison-token.ts
import { controlDb } from "@/server/db/control-db";
import { resolveQuestionnaireDimensionCategories } from "./resolve-questionnaire-dimension-categories";
import { createHash } from "crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { questionnaireDimensions } from "@/drizzle/schema";
import {
  assessmentDimensionScores,
  comparisonShares,
} from "@/drizzle/schema/tenant";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import type { TenantAuditActorContext } from "@/server/audit/write-tenant-audit-log";

import type { ComparisonObjectResult } from "../types/comparison-report.types";

type ResolveComparisonTokenInput = {
  db: any;
  controlDb: typeof controlDb;
  ctx: TenantAuditActorContext;
  token: string;
};

function hashComparisonToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function resolveComparisonToken({
  db,
  controlDb,
  ctx,
  token,
}: ResolveComparisonTokenInput): Promise<ComparisonObjectResult> {
  const tokenHash = hashComparisonToken(token);
  const now = new Date();

  const [share] = await db
    .select({
      id: comparisonShares.id,
      label: comparisonShares.label,
      status: comparisonShares.status,
      expiresAt: comparisonShares.expiresAt,
      revokedAt: comparisonShares.revokedAt,
      isSingleUse: comparisonShares.isSingleUse,
      assessmentSessionId: comparisonShares.assessmentSessionId,
      respondentId: comparisonShares.respondentId,
      metadata: comparisonShares.metadata,
    })
    .from(comparisonShares)
    .where(
      and(
        eq(comparisonShares.tokenHash, tokenHash),
        eq(comparisonShares.status, "active"),
        isNull(comparisonShares.revokedAt),
        isNull(comparisonShares.deletedAt),
        or(
          isNull(comparisonShares.expiresAt),
          gt(comparisonShares.expiresAt, now),
        ),
      ),
    )
    .limit(1);

  if (!share) {
    return {
      type: "shared_token",
      id: "invalid",
      label: "Udostępniony wynik",
      n: 0,
      visibility: {
        canShow: false,
        reason: "no_permission",
      },
      scores: [],
    };
  }

  const questionnaireVersionId =
    typeof share.metadata === "object" &&
      share.metadata &&
      "questionnaireVersionId" in share.metadata
      ? String(share.metadata.questionnaireVersionId)
      : null;
  const questionnaireId =
    typeof share.metadata === "object" &&
      share.metadata &&
      "questionnaireId" in share.metadata
      ? String(share.metadata.questionnaireId)
      : null;
  if (!questionnaireVersionId) {
    return {
      type: "shared_token",
      id: share.id,
      label: share.label || "Udostępniony wynik",
      n: 0,
      visibility: {
        canShow: false,
        reason: "no_permission",
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
        eq(
          assessmentDimensionScores.assessmentSessionId,
          share.assessmentSessionId,
        ),
        eq(
          assessmentDimensionScores.questionnaireVersionId,
          questionnaireVersionId,
        ),
        isNull(assessmentDimensionScores.deletedAt),
      ),
    );

  await db
    .update(comparisonShares)
    .set({
      lastUsedAt: now,
      ...(share.isSingleUse
        ? {
          status: "used",
          revokedAt: now,
        }
        : {}),
    })
    .where(eq(comparisonShares.id, share.id));

  await writeTenantAuditLog({
    db,
    ctx,
    action: "comparison_share_used",
    entityType: "comparison_share",
    entityId: share.id,
    after: {
      assessmentSessionId: share.assessmentSessionId,
      respondentId: share.respondentId,
      isSingleUse: share.isSingleUse,
    },
  });
  const categoryByDimensionId = await resolveQuestionnaireDimensionCategories({
    controlDb,
    dimensionIds: scores.map((row: any) => row.dimensionId),
  });
return {
  type: "shared_token",
  id: share.id,
  label: share.label || "Udostępniony wynik",
  n: 1,

  respondentId: share.respondentId,
  assessmentSessionId: share.assessmentSessionId,
  assessmentProjectId: null,

  questionnaireId: questionnaireId ?? scores[0]?.questionnaireId ?? null,
  questionnaireVersionId:
    questionnaireVersionId ?? scores[0]?.questionnaireVersionId ?? null,

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