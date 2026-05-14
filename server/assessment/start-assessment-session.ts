import { and, eq, isNull } from "drizzle-orm";

import { tenantDatabaseConnections, tenants } from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentProjectRespondents,
  assessmentProjects,
  assessmentSessions,
  tenantAuditLog,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";
import { decryptSecret } from "@/server/security/encryption";

export type StartAssessmentSessionResult =
  | {
      ok: true;
      tenantSlug: string;
      sessionId: string;
    }
  | {
      ok: false;
      message: string;
      reason:
        | "missing_token"
        | "invalid_token"
        | "not_found"
        | "expired"
        | "revoked"
        | "project_inactive"
        | "respondent_inactive";
    };

function isTokenShapeValid(token: string) {
  return /^[A-Za-z0-9_-]{32,160}$/.test(token);
}

export async function startAssessmentSessionFromToken(
  token: string,
): Promise<StartAssessmentSessionResult> {
  const normalizedToken = token?.trim();

  if (!normalizedToken) {
    return {
      ok: false,
      reason: "missing_token",
      message: "Brak tokena dostępu do badania.",
    };
  }

  if (!isTokenShapeValid(normalizedToken)) {
    return {
      ok: false,
      reason: "invalid_token",
      message: "Nieprawidłowy format linku do badania.",
    };
  }

  const tokenHash = hashAssessmentAccessToken(normalizedToken);
  const now = new Date();

  const activeTenantConnections = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      databaseName: tenantDatabaseConnections.databaseName,
      databaseUrlEncrypted: tenantDatabaseConnections.databaseUrlEncrypted,
      migrationStatus: tenantDatabaseConnections.migrationStatus,
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

    const accessRows = await db
      .select({
        accessLinkId: assessmentAccessLinks.id,
        accessLinkStatus: assessmentAccessLinks.status,
        accessLinkExpiresAt: assessmentAccessLinks.expiresAt,
        accessLinkDeletedAt: assessmentAccessLinks.deletedAt,

        assessmentProjectId: assessmentAccessLinks.assessmentProjectId,
        respondentId: assessmentAccessLinks.respondentId,
        projectRespondentId: assessmentAccessLinks.projectRespondentId,

        projectStatus: assessmentProjects.status,
        projectDeletedAt: assessmentProjects.deletedAt,

        projectRespondentStatus: assessmentProjectRespondents.status,
        projectRespondentStartedAt: assessmentProjectRespondents.startedAt,
        projectRespondentDeletedAt: assessmentProjectRespondents.deletedAt,
      })
      .from(assessmentAccessLinks)
      .innerJoin(
        assessmentProjects,
        eq(assessmentProjects.id, assessmentAccessLinks.assessmentProjectId),
      )
      .innerJoin(
        assessmentProjectRespondents,
        eq(
          assessmentProjectRespondents.id,
          assessmentAccessLinks.projectRespondentId,
        ),
      )
      .where(
        and(
          eq(assessmentAccessLinks.tokenHash, tokenHash),
          isNull(assessmentAccessLinks.deletedAt),
        ),
      )
      .limit(1);

    const access = accessRows[0];

    if (!access) {
      continue;
    }

    if (access.accessLinkStatus === "revoked") {
      return {
        ok: false,
        reason: "revoked",
        message: "Ten link do badania został unieważniony.",
      };
    }

    if (access.accessLinkStatus === "expired") {
      return {
        ok: false,
        reason: "expired",
        message: "Ten link do badania wygasł.",
      };
    }

    if (access.accessLinkStatus !== "active") {
      return {
        ok: false,
        reason: "revoked",
        message: "Ten link do badania nie jest już aktywny.",
      };
    }

    if (access.accessLinkExpiresAt <= now) {
      await db
        .update(assessmentAccessLinks)
        .set({
          status: "expired",
          updatedAt: now,
        })
        .where(eq(assessmentAccessLinks.id, access.accessLinkId));

      return {
        ok: false,
        reason: "expired",
        message: "Ten link do badania wygasł.",
      };
    }

    if (
      access.projectDeletedAt ||
      !["draft", "active"].includes(access.projectStatus)
    ) {
      return {
        ok: false,
        reason: "project_inactive",
        message: "Projekt badawczy nie jest aktywny.",
      };
    }

    if (access.projectRespondentDeletedAt) {
      return {
        ok: false,
        reason: "respondent_inactive",
        message: "Ten respondent nie ma już aktywnego dostępu do badania.",
      };
    }

    const [session] = await db
      .insert(assessmentSessions)
      .values({
        assessmentProjectId: access.assessmentProjectId,
        respondentId: access.respondentId,
        projectRespondentId: access.projectRespondentId,
        accessLinkId: access.accessLinkId,
        status: "in_progress",
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await db
      .update(assessmentProjectRespondents)
      .set({
        status:
          access.projectRespondentStatus === "completed"
            ? "completed"
            : "started",
        startedAt: access.projectRespondentStartedAt ?? now,
        updatedAt: now,
      })
      .where(
        eq(assessmentProjectRespondents.id, access.projectRespondentId),
      );

    await db
      .update(assessmentAccessLinks)
      .set({
        lastAccessedAt: now,
        updatedAt: now,
      })
      .where(eq(assessmentAccessLinks.id, access.accessLinkId));

    await db.insert(tenantAuditLog).values({
      actorUserId: null,
      actorRole: "PUBLIC_RESPONDENT",
      action: "assessment_session_started",
      entityType: "assessment_session",
      entityId: session.id,
      after: {
        assessmentProjectId: session.assessmentProjectId,
        respondentId: session.respondentId,
        projectRespondentId: session.projectRespondentId,
        accessLinkId: session.accessLinkId,
        status: session.status,
      },
    });

    return {
      ok: true,
      tenantSlug: connection.tenantSlug,
      sessionId: session.id,
    };
  }

  return {
    ok: false,
    reason: "not_found",
    message: "Nie znaleziono aktywnego linku do badania.",
  };
}