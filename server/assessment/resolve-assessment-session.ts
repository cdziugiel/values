import { and, eq, isNull } from "drizzle-orm";

import { tenantDatabaseConnections, tenants } from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentProjects,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";
import { decryptSecret } from "@/server/security/encryption";

export type ResolveAssessmentSessionResult =
  | {
      ok: true;
      data: {
        tenant: {
          id: string;
          slug: string;
          name: string;
        };
        session: {
          id: string;
          status: string;
          startedAt: Date;
        };
        project: {
          id: string;
          name: string;
          description: string | null;
        };
        respondent: {
          id: string;
          displayName: string;
          email: string | null;
        };
      };
    }
  | {
      ok: false;
      message: string;
    };

function getDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ");

  return name || input.email || input.externalCode || "Respondent";
}

export async function resolveAssessmentSession({
  token,
  sessionId,
}: {
  token: string;
  sessionId: string;
}): Promise<ResolveAssessmentSessionResult> {
  const tokenHash = hashAssessmentAccessToken(token);

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

    const rows = await db
      .select({
        sessionId: assessmentSessions.id,
        sessionStatus: assessmentSessions.status,
        sessionStartedAt: assessmentSessions.startedAt,

        accessLinkId: assessmentAccessLinks.id,
        accessLinkStatus: assessmentAccessLinks.status,

        projectId: assessmentProjects.id,
        projectName: assessmentProjects.name,
        projectDescription: assessmentProjects.description,

        respondentId: respondents.id,
        respondentExternalCode: respondents.externalCode,
        respondentEmail: respondentIdentities.email,
        respondentFirstName: respondentIdentities.firstName,
        respondentLastName: respondentIdentities.lastName,
      })
      .from(assessmentSessions)
      .innerJoin(
        assessmentAccessLinks,
        eq(assessmentAccessLinks.id, assessmentSessions.accessLinkId),
      )
      .innerJoin(
        assessmentProjects,
        eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
      )
      .innerJoin(
        respondents,
        eq(respondents.id, assessmentSessions.respondentId),
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
          eq(assessmentSessions.id, sessionId),
          eq(assessmentAccessLinks.tokenHash, tokenHash),
          isNull(assessmentSessions.deletedAt),
          isNull(assessmentAccessLinks.deletedAt),
        ),
      )
      .limit(1);

    const row = rows[0];

    if (!row) {
      continue;
    }

    if (row.accessLinkStatus !== "active") {
      return {
        ok: false,
        message: "Link do badania nie jest aktywny.",
      };
    }

    return {
      ok: true,
      data: {
        tenant: {
          id: connection.tenantId,
          slug: connection.tenantSlug,
          name: connection.tenantName,
        },
        session: {
          id: row.sessionId,
          status: row.sessionStatus,
          startedAt: row.sessionStartedAt,
        },
        project: {
          id: row.projectId,
          name: row.projectName,
          description: row.projectDescription,
        },
        respondent: {
          id: row.respondentId,
          email: row.respondentEmail,
          displayName: getDisplayName({
            firstName: row.respondentFirstName,
            lastName: row.respondentLastName,
            email: row.respondentEmail,
            externalCode: row.respondentExternalCode,
          }),
        },
      },
    };
  }

  return {
    ok: false,
    message: "Nie znaleziono aktywnej sesji badania.",
  };
}