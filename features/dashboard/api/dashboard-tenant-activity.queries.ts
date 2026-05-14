import { and, count, eq, isNull } from "drizzle-orm";

import {
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
  assessmentProjects,
  assessmentSessions,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";

export type DashboardTenantActivityItem = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  databaseName: string | null;
  migrationStatus: string | null;
  schemaVersion: number | null;
  ok: boolean;
  errorMessage: string | null;
  projectsCount: number;
  respondentsCount: number;
  sessionsCount: number;
  inProgressSessionsCount: number;
  completedSessionsCount: number;
};

function numberFromCount(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listDashboardTenantActivity(): Promise<
  DashboardTenantActivityItem[]
> {
  const connections = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      tenantStatus: tenants.status,
      databaseName: tenantDatabaseConnections.databaseName,
      databaseUrlEncrypted: tenantDatabaseConnections.databaseUrlEncrypted,
      migrationStatus: tenantDatabaseConnections.migrationStatus,
      schemaVersion: tenantDatabaseConnections.schemaVersion,
    })
    .from(tenants)
    .leftJoin(
      tenantDatabaseConnections,
      eq(tenantDatabaseConnections.tenantId, tenants.id),
    )
    .where(
      and(
        eq(tenants.status, "active"),
        isNull(tenants.deletedAt),
      ),
    );

  const results: DashboardTenantActivityItem[] = [];

  for (const connection of connections) {
    const base: DashboardTenantActivityItem = {
      tenantId: connection.tenantId,
      tenantSlug: connection.tenantSlug,
      tenantName: connection.tenantName,
      databaseName: connection.databaseName,
      migrationStatus: connection.migrationStatus,
      schemaVersion:
        connection.schemaVersion === null || connection.schemaVersion === undefined
          ? null
          : Number(connection.schemaVersion),
      ok: false,
      errorMessage: null,
      projectsCount: 0,
      respondentsCount: 0,
      sessionsCount: 0,
      inProgressSessionsCount: 0,
      completedSessionsCount: 0,
    };

    if (!connection.databaseName || !connection.databaseUrlEncrypted) {
      results.push({
        ...base,
        errorMessage: "Brak skonfigurowanej bazy tenanta.",
      });
      continue;
    }

    if (connection.migrationStatus !== "success") {
      results.push({
        ...base,
        errorMessage: `Baza tenanta nie jest gotowa: ${connection.migrationStatus}.`,
      });
      continue;
    }

    try {
      const databaseUrl = decryptSecret(connection.databaseUrlEncrypted);

      const db = getTenantDbByConnection({
        tenantId: connection.tenantId,
        databaseName: connection.databaseName,
        schemaVersion: Number(connection.schemaVersion ?? 0),
        databaseUrl,
      });

      const [
        projectsRows,
        respondentsRows,
        sessionsRows,
        inProgressRows,
        completedRows,
      ] = await Promise.all([
        db
          .select({ value: count() })
          .from(assessmentProjects)
          .where(isNull(assessmentProjects.deletedAt)),

        db
          .select({ value: count() })
          .from(respondents)
          .where(isNull(respondents.deletedAt)),

        db
          .select({ value: count() })
          .from(assessmentSessions)
          .where(isNull(assessmentSessions.deletedAt)),

        db
          .select({ value: count() })
          .from(assessmentSessions)
          .where(
            and(
              eq(assessmentSessions.status, "in_progress"),
              isNull(assessmentSessions.deletedAt),
            ),
          ),

        db
          .select({ value: count() })
          .from(assessmentSessions)
          .where(
            and(
              eq(assessmentSessions.status, "completed"),
              isNull(assessmentSessions.deletedAt),
            ),
          ),
      ]);

      results.push({
        ...base,
        ok: true,
        projectsCount: numberFromCount(projectsRows[0]?.value),
        respondentsCount: numberFromCount(respondentsRows[0]?.value),
        sessionsCount: numberFromCount(sessionsRows[0]?.value),
        inProgressSessionsCount: numberFromCount(inProgressRows[0]?.value),
        completedSessionsCount: numberFromCount(completedRows[0]?.value),
      });
    } catch (error) {
      results.push({
        ...base,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Nie udało się odczytać aktywności tenanta.",
      });
    }
  }

  return results.sort((a, b) =>
    a.tenantName.localeCompare(b.tenantName, "pl"),
  );
}