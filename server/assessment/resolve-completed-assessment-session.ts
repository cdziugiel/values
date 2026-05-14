import { and, eq, isNull } from "drizzle-orm";

import { tenantDatabaseConnections, tenants } from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentProjects,
  assessmentSessions,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";
import { decryptSecret } from "@/server/security/encryption";

export type ResolveCompletedAssessmentSessionResult =
  | {
      ok: true;
      data: {
        tenant: {
          id: string;
          slug: string;
          name: string;
        };
        project: {
          id: string;
          name: string;
        };
        session: {
          id: string;
          status: string;
          completedAt: Date;
        };
      };
    }
  | {
      ok: false;
      message: string;
    };

export async function resolveCompletedAssessmentSession({
  token,
  sessionId,
}: {
  token: string;
  sessionId: string;
}): Promise<ResolveCompletedAssessmentSessionResult> {
  const tokenHash = hashAssessmentAccessToken(token);

  const activeTenantConnections = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
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

    const rows = await db
      .select({
        sessionId: assessmentSessions.id,
        sessionStatus: assessmentSessions.status,
        sessionCompletedAt: assessmentSessions.completedAt,

        projectId: assessmentProjects.id,
        projectName: assessmentProjects.name,
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
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentAccessLinks.tokenHash, tokenHash),
          eq(assessmentSessions.status, "completed"),
          isNull(assessmentSessions.deletedAt),
        ),
      )
      .limit(1);

    const row = rows[0];

    if (!row || !row.sessionCompletedAt) {
      continue;
    }

    return {
      ok: true,
      data: {
        tenant: {
          id: connection.tenantId,
          slug: connection.tenantSlug,
          name: connection.tenantName,
        },
        project: {
          id: row.projectId,
          name: row.projectName,
        },
        session: {
          id: row.sessionId,
          status: row.sessionStatus,
          completedAt: row.sessionCompletedAt,
        },
      },
    };
  }

  return {
    ok: false,
    message: "Nie znaleziono zakończonej sesji badania.",
  };
}