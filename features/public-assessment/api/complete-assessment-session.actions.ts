"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import {
  questionnaireItems,
  questionnaireVersions,
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentProjectQuestionnaires,
  assessmentProjectRespondents,
  assessmentResponses,
  assessmentSessions,
  tenantAuditLog,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";
import { decryptSecret } from "@/server/security/encryption";

export type CompleteAssessmentSessionState = {
  status: "idle" | "error";
  message: string;
};

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
  const now = new Date();

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
        accessLinkId: assessmentAccessLinks.id,
        accessLinkStatus: assessmentAccessLinks.status,
        assessmentProjectId: assessmentSessions.assessmentProjectId,
        respondentId: assessmentSessions.respondentId,
        projectRespondentId: assessmentSessions.projectRespondentId,
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

    if (session.accessLinkStatus !== "active") {
      return {
        status: "error",
        message: "Link do badania nie jest aktywny.",
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

    if (projectQuestionnaires.length === 0) {
      return {
        status: "error",
        message: "Do projektu nie przypisano żadnego kwestionariusza.",
      };
    }

    const questionnaireVersionIds = projectQuestionnaires.map(
      (row) => row.questionnaireVersionId,
    );

    const requiredItems = await controlDb
      .select({
        id: questionnaireItems.id,
        code: questionnaireItems.code,
      })
      .from(questionnaireItems)
      .innerJoin(
        questionnaireVersions,
        eq(questionnaireVersions.id, questionnaireItems.questionnaireVersionId),
      )
      .where(
        and(
          inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
          eq(questionnaireItems.required, true),
          isNull(questionnaireItems.deletedAt),
          isNull(questionnaireVersions.deletedAt),
        ),
      );

    const responses = await db
      .select({
        questionnaireItemId: assessmentResponses.questionnaireItemId,
      })
      .from(assessmentResponses)
      .where(
        and(
          eq(assessmentResponses.assessmentSessionId, session.sessionId),
          isNull(assessmentResponses.deletedAt),
        ),
      );

    const answeredItemIds = new Set(
      responses.map((response) => response.questionnaireItemId),
    );

    const missingRequiredItems = requiredItems.filter(
      (item) => !answeredItemIds.has(item.id),
    );

    if (missingRequiredItems.length > 0) {
      return {
        status: "error",
        message: `Nie można zakończyć badania. Brakuje odpowiedzi na ${missingRequiredItems.length} wymagane pytania.`,
      };
    }

    await db
      .update(assessmentSessions)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(assessmentSessions.id, session.sessionId));

    await db
      .update(assessmentProjectRespondents)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
      })
      .where(
        eq(
          assessmentProjectRespondents.id,
          session.projectRespondentId,
        ),
      );

    await db
      .update(assessmentAccessLinks)
      .set({
        status: "used",
        usedAt: now,
        updatedAt: now,
      })
      .where(eq(assessmentAccessLinks.id, session.accessLinkId));

    await db.insert(tenantAuditLog).values({
      actorUserId: null,
      actorRole: "PUBLIC_RESPONDENT",
      action: "assessment_session_completed",
      entityType: "assessment_session",
      entityId: session.sessionId,
      after: {
        assessmentProjectId: session.assessmentProjectId,
        respondentId: session.respondentId,
        projectRespondentId: session.projectRespondentId,
        responseCount: responses.length,
        completedAt: now,
      },
    });

    redirect(`/a/${token}/session/${sessionId}/completed`);
  }

  return {
    status: "error",
    message: "Nie znaleziono aktywnej sesji badania.",
  };
}