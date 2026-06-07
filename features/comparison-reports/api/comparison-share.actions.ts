// features/comparison-reports/api/comparison-share.actions.ts

"use server";

import { createHash, randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";

import {
  assessmentDimensionScores,
  assessmentSessions,
  comparisonShares,
} from "@/drizzle/schema/tenant";
import { createComparisonShareSchema } from "@/features/comparison-reports/forms/comparison-share.schema";
import { assertMyAssessmentSessionAccess } from "@/features/my-assessment/api/assert-my-assessment-session-access";
import { getMyAssessmentRuntime } from "@/features/my-assessment/api/my-assessment-runtime";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import { requireSession } from "@/server/auth/require-session";

function hashComparisonToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createComparisonToken() {
  return randomBytes(32).toString("base64url");
}

export async function createMyComparisonShareAction(input: unknown) {
  const session = await requireSession();

  if (!session.user?.id || !session.user?.email) {
    return {
      ok: false,
      error: "Musisz być zalogowany, aby utworzyć token porównania.",
    };
  }

  const parsed = createComparisonShareSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Nieprawidłowe dane formularza.",
    };
  }

  const {
    assessmentSessionId,
    questionnaireVersionId,
    label,
    expiresInDays,
    isSingleUse,
  } = parsed.data;

  const runtime = await getMyAssessmentRuntime({
    userId: session.user.id,
  });

  if (!runtime) {
    return {
      ok: false,
      error: "Nie udało się odnaleźć środowiska badania.",
    };
  }

  const { db, ctx } = runtime;

  await assertMyAssessmentSessionAccess({
    db,
    userEmail: session.user.email,
    assessmentSessionId,
  });

  const [assessmentSession] = await db
    .select({
      id: assessmentSessions.id,
      respondentId: assessmentSessions.respondentId,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
      projectRespondentId: assessmentSessions.projectRespondentId,
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

  if (!assessmentSession) {
    return {
      ok: false,
      error: "Nie znaleziono sesji badania.",
    };
  }

  if (assessmentSession.status !== "completed") {
    return {
      ok: false,
      error: "Token porównania można utworzyć tylko dla ukończonego badania.",
    };
  }

  const [scoreScope] = await db
    .select({
      questionnaireId: assessmentDimensionScores.questionnaireId,
      questionnaireVersionId: assessmentDimensionScores.questionnaireVersionId,
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
    )
    .limit(1);

  if (!scoreScope) {
    return {
      ok: false,
      error:
        "Nie znaleziono ukończonego wyniku dla wybranego kwestionariusza.",
    };
  }

  const token = createComparisonToken();
  const tokenHash = hashComparisonToken(token);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const [share] = await db
    .insert(comparisonShares)
    .values({
      respondentId: assessmentSession.respondentId,
      assessmentSessionId: assessmentSession.id,
      tokenHash,
      status: "active",
      label: label?.trim() || null,
      allowedScope: "comparison_snapshot",
      expiresAt,
      isSingleUse,
      metadata: {
        questionnaireId: scoreScope.questionnaireId,
        questionnaireVersionId: scoreScope.questionnaireVersionId,
        createdFrom: "my_assessment",
      },
    })
    .returning({
      id: comparisonShares.id,
      expiresAt: comparisonShares.expiresAt,
    });

  await writeTenantAuditLog({
    db,
    ctx,
    action: "comparison_share_created",
    entityType: "comparison_share",
    entityId: share.id,
    after: {
      assessmentSessionId: assessmentSession.id,
      respondentId: assessmentSession.respondentId,
      assessmentProjectId: assessmentSession.assessmentProjectId,
      projectRespondentId: assessmentSession.projectRespondentId,
      questionnaireId: scoreScope.questionnaireId,
      questionnaireVersionId: scoreScope.questionnaireVersionId,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      isSingleUse,
      allowedScope: "comparison_snapshot",
    },
  });

  return {
    ok: true,
    token,
    shareId: share.id,
    expiresAt: share.expiresAt?.toISOString() ?? null,
  };
}