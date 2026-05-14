"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { calculateAssessmentSessionScores } from "@/server/assessment/calculate-assessment-session-scores";
import {
  questionnaireItems,
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentProjectQuestionnaires,
  assessmentResponses,
  assessmentSessions,
  tenantAuditLog,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";
import { decryptSecret } from "@/server/security/encryption";

export type CompleteAssessmentSessionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function isResponseFilled(response: {
  valueType: string;
  numberValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  jsonValue: unknown | null;
}) {
  if (response.valueType === "number") {
    return response.numberValue !== null && response.numberValue !== undefined;
  }

  if (response.valueType === "text") {
    return typeof response.textValue === "string" && response.textValue.trim();
  }

  if (response.valueType === "boolean") {
    return typeof response.booleanValue === "boolean";
  }

  if (response.valueType === "json") {
    return Array.isArray(response.jsonValue) && response.jsonValue.length > 0;
  }

  return false;
}

export async function completeAssessmentSessionAction(
  _previousState: CompleteAssessmentSessionState,
  formData: FormData,
): Promise<CompleteAssessmentSessionState> {
  const token = String(formData.get("token") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!token || !sessionId) {
    return {
      status: "error",
      message: "Brak danych sesji.",
    };
  }

  const tokenHash = hashAssessmentAccessToken(token);

  const activeTenantConnections = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      databaseName: tenantDatabaseConnections.databaseName,
      databaseUrlEncrypted: tenantDatabaseConnections.databaseUrlEncrypted,
      schemaVersion: tenantDatabaseConnections.schemaVersion,
    })
    .from(tenants)
    .innerJoin(
      tenantDatabaseConnections,
      eq(tenantDatabaseConnections.tenantId, tenants.id),
    )
    .where(
      and(
        eq(tenants.status, "active"),
        isNull(tenants.deletedAt),
        eq(tenantDatabaseConnections.migrationStatus, "success"),
      ),
    );

  for (const connection of activeTenantConnections) {
    let databaseUrl: string;

    try {
      databaseUrl = decryptSecret(connection.databaseUrlEncrypted);
    } catch {
      continue;
    }

    const db = getTenantDbByConnection({
      tenantId: connection.tenantId,
      databaseName: connection.databaseName,
      schemaVersion: Number(connection.schemaVersion ?? 0),
      databaseUrl,
    });

    const sessionRows = await db
      .select({
        sessionId: assessmentSessions.id,
        sessionStatus: assessmentSessions.status,
        assessmentProjectId: assessmentSessions.assessmentProjectId,
        accessLinkId: assessmentAccessLinks.id,
      })
      .from(assessmentSessions)
      .innerJoin(
        assessmentAccessLinks,
        eq(assessmentAccessLinks.id, assessmentSessions.accessLinkId),
      )
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentAccessLinks.tokenHash, tokenHash),
          eq(assessmentAccessLinks.status, "active"),
          isNull(assessmentSessions.deletedAt),
          isNull(assessmentAccessLinks.deletedAt),
        ),
      )
      .limit(1);

    const session = sessionRows[0];

    if (!session) {
      continue;
    }

    if (session.sessionStatus === "completed") {
      redirect(`/a/${token}/session/${sessionId}/completed`);
    }

    if (session.sessionStatus !== "in_progress") {
      return {
        status: "error",
        message: "Ta sesja nie jest aktywna.",
      };
    }

    const projectQuestionnaires = await db
      .select({
        questionnaireVersionId:
          assessmentProjectQuestionnaires.questionnaireVersionId,
      })
      .from(assessmentProjectQuestionnaires)
      .where(
        and(
          eq(
            assessmentProjectQuestionnaires.assessmentProjectId,
            session.assessmentProjectId,
          ),
          eq(assessmentProjectQuestionnaires.status, "active"),
          isNull(assessmentProjectQuestionnaires.deletedAt),
        ),
      );

    const questionnaireVersionIds = projectQuestionnaires.map(
      (item) => item.questionnaireVersionId,
    );

    if (questionnaireVersionIds.length === 0) {
      return {
        status: "error",
        message: "Projekt nie ma przypisanych aktywnych kwestionariuszy.",
      };
    }

    const requiredItems = await controlDb
      .select({
        id: questionnaireItems.id,
      })
      .from(questionnaireItems)
      .where(
        and(
          inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
          eq(questionnaireItems.required, true),
          isNull(questionnaireItems.deletedAt),
        ),
      );

    const responses = await db
      .select({
        questionnaireItemId: assessmentResponses.questionnaireItemId,
        valueType: assessmentResponses.valueType,
        numberValue: assessmentResponses.numberValue,
        textValue: assessmentResponses.textValue,
        booleanValue: assessmentResponses.booleanValue,
        jsonValue: assessmentResponses.jsonValue,
      })
      .from(assessmentResponses)
      .where(
        and(
          eq(assessmentResponses.assessmentSessionId, session.sessionId),
          isNull(assessmentResponses.deletedAt),
        ),
      );

    const filledResponseItemIds = new Set(
      responses
        .filter((response) => isResponseFilled(response))
        .map((response) => response.questionnaireItemId),
    );

    const missingRequiredCount = requiredItems.filter(
      (item) => !filledResponseItemIds.has(item.id),
    ).length;

    if (missingRequiredCount > 0) {
      return {
        status: "error",
        message: `Nie wszystkie wymagane pytania mają odpowiedzi. Brakuje: ${missingRequiredCount}.`,
      };
    }

    const now = new Date();

    await db
      .update(assessmentSessions)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(assessmentSessions.id, session.sessionId));

    const scoringResult = await calculateAssessmentSessionScores({
      db,
      sessionId: session.sessionId,
    });

    await db.insert(tenantAuditLog).values({
      actorUserId: null,
      actorRole: "PUBLIC_RESPONDENT",
      action: "assessment_session_completed",
      entityType: "assessment_session",
      entityId: session.sessionId,
      after: {
        completedAt: now.toISOString(),
        scoring: scoringResult,
      },
    });

    redirect(`/a/${token}/session/${sessionId}/completed`);
  }

  return {
    status: "error",
    message: "Nie znaleziono aktywnej sesji badania.",
  };
}