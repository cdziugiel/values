import { and, eq, gt, isNull } from "drizzle-orm";

import { tenantDatabaseConnections, tenants } from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentProjectRespondents,
  assessmentProjects,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";

import type { ResolvedAssessmentAccess } from "./assessment-access.types";

export type ResolveAssessmentAccessTokenResult =
  | {
      ok: true;
      data: ResolvedAssessmentAccess;
    }
  | {
      ok: false;
      reason:
        | "missing_token"
        | "invalid_token"
        | "not_found"
        | "expired"
        | "revoked"
        | "project_inactive"
        | "respondent_inactive";
      message: string;
    };

function isTokenShapeValid(token: string) {
  return /^[A-Za-z0-9_-]{32,160}$/.test(token);
}

export async function resolveAssessmentAccessToken(
  token: string,
): Promise<ResolveAssessmentAccessTokenResult> {
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
      tenantStatus: tenants.status,

      connectionId: tenantDatabaseConnections.id,
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
    } catch (error) {
      console.error("Skipping tenant during token resolution: decrypt failed", {
        tenantSlug: connection.tenantSlug,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
      });

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
        accessLinkLastAccessedAt: assessmentAccessLinks.lastAccessedAt,
        accessLinkUsedAt: assessmentAccessLinks.usedAt,

        assessmentProjectId: assessmentProjects.id,
        assessmentProjectName: assessmentProjects.name,
        assessmentProjectDescription: assessmentProjects.description,
        assessmentProjectStatus: assessmentProjects.status,
        assessmentProjectStartsAt: assessmentProjects.startsAt,
        assessmentProjectEndsAt: assessmentProjects.endsAt,
        assessmentProjectDeletedAt: assessmentProjects.deletedAt,

        projectRespondentId: assessmentProjectRespondents.id,
        projectRespondentStatus: assessmentProjectRespondents.status,
        projectRespondentInvitedAt: assessmentProjectRespondents.invitedAt,
        projectRespondentStartedAt: assessmentProjectRespondents.startedAt,
        projectRespondentCompletedAt: assessmentProjectRespondents.completedAt,
        projectRespondentDeletedAt: assessmentProjectRespondents.deletedAt,

        respondentId: respondents.id,
        respondentExternalCode: respondents.externalCode,
        respondentDeletedAt: respondents.deletedAt,

        respondentEmail: respondentIdentities.email,
        respondentFirstName: respondentIdentities.firstName,
        respondentLastName: respondentIdentities.lastName,
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
      .innerJoin(
        respondents,
        eq(respondents.id, assessmentAccessLinks.respondentId),
      )
      .leftJoin(
        respondentIdentities,
        and(
          eq(respondentIdentities.respondentId, respondents.id),
          isNull(respondentIdentities.deletedAt),
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
      access.assessmentProjectDeletedAt ||
      !["draft", "active"].includes(access.assessmentProjectStatus)
    ) {
      return {
        ok: false,
        reason: "project_inactive",
        message: "Projekt badawczy nie jest aktywny.",
      };
    }

    if (access.projectRespondentDeletedAt || access.respondentDeletedAt) {
      return {
        ok: false,
        reason: "respondent_inactive",
        message: "Ten respondent nie ma już aktywnego dostępu do badania.",
      };
    }

    await db
      .update(assessmentAccessLinks)
      .set({
        lastAccessedAt: now,
        updatedAt: now,
      })
      .where(eq(assessmentAccessLinks.id, access.accessLinkId));

    return {
      ok: true,
      data: {
        tenant: {
          id: connection.tenantId,
          slug: connection.tenantSlug,
          name: connection.tenantName,
        },

        accessLink: {
          id: access.accessLinkId,
          status: access.accessLinkStatus,
          expiresAt: access.accessLinkExpiresAt,
          lastAccessedAt: now,
          usedAt: access.accessLinkUsedAt,
        },

        project: {
          id: access.assessmentProjectId,
          name: access.assessmentProjectName,
          description: access.assessmentProjectDescription,
          status: access.assessmentProjectStatus,
          startsAt: access.assessmentProjectStartsAt,
          endsAt: access.assessmentProjectEndsAt,
        },

        projectRespondent: {
          id: access.projectRespondentId,
          status: access.projectRespondentStatus,
          invitedAt: access.projectRespondentInvitedAt,
          startedAt: access.projectRespondentStartedAt,
          completedAt: access.projectRespondentCompletedAt,
        },

        respondent: {
          id: access.respondentId,
          externalCode: access.respondentExternalCode,
          email: access.respondentEmail,
          firstName: access.respondentFirstName,
          lastName: access.respondentLastName,
        },
      },
    };
  }

  return {
    ok: false,
    reason: "not_found",
    message: "Nie znaleziono aktywnego linku do badania.",
  };
}