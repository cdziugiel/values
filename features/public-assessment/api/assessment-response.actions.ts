"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { tenantDatabaseConnections, tenants } from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentResponses,
  assessmentSessions,
  tenantAuditLog,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";
import { decryptSecret } from "@/server/security/encryption";

export type SaveAssessmentResponsesState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function saveAssessmentResponsesAction(
  _previousState: SaveAssessmentResponsesState,
  formData: FormData,
): Promise<SaveAssessmentResponsesState> {
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
        accessLinkId: assessmentAccessLinks.id,
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

    if (session.sessionStatus !== "in_progress") {
      return {
        status: "error",
        message: "Ta sesja nie jest aktywna.",
      };
    }

    const responseEntries = Array.from(formData.entries()).filter(([key]) =>
      key.startsWith("response:"),
    );

    if (responseEntries.length === 0) {
      return {
        status: "error",
        message: "Brak odpowiedzi do zapisania.",
      };
    }

    const now = new Date();

    for (const [key, rawValue] of responseEntries) {
      const [, questionnaireId, questionnaireVersionId, itemId, itemCode] =
        key.split(":");

      const value = Number(rawValue);

      if (!Number.isInteger(value)) {
        continue;
      }

      const existing = await db.query.assessmentResponses.findFirst({
        where: and(
          eq(assessmentResponses.assessmentSessionId, session.sessionId),
          eq(assessmentResponses.questionnaireItemId, itemId),
          isNull(assessmentResponses.deletedAt),
        ),
      });

      if (existing) {
        await db
          .update(assessmentResponses)
          .set({
            valueType: "number",
            numberValue: value,
            updatedAt: now,
          })
          .where(eq(assessmentResponses.id, existing.id));
      } else {
        await db.insert(assessmentResponses).values({
          assessmentSessionId: session.sessionId,
          questionnaireId,
          questionnaireVersionId,
          questionnaireItemId: itemId,
          itemCode,
          valueType: "number",
          numberValue: value,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await db.insert(tenantAuditLog).values({
      actorUserId: null,
      actorRole: "PUBLIC_RESPONDENT",
      action: "assessment_responses_saved",
      entityType: "assessment_session",
      entityId: session.sessionId,
      after: {
        responseCount: responseEntries.length,
      },
    });

    revalidatePath(`/a/${token}/session/${sessionId}`);

    return {
      status: "success",
      message: "Odpowiedzi zostały zapisane.",
    };
  }

  return {
    status: "error",
    message: "Nie znaleziono aktywnej sesji badania.",
  };
}