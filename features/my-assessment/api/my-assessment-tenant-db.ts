import { and, eq, isNull } from "drizzle-orm";

import {
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";

export const DEFAULT_MY_ASSESSMENT_TENANT_SLUG =
  process.env.PUBLIC_ASSESSMENT_TENANT_SLUG || "humanet";

export function resolveMyAssessmentTenantSlug(tenantSlug?: string | null) {
  const normalized = tenantSlug?.trim();

  return normalized || DEFAULT_MY_ASSESSMENT_TENANT_SLUG;
}

export async function getMyAssessmentTenantDbBySlug(
  tenantSlug?: string | null,
) {
  const resolvedTenantSlug = resolveMyAssessmentTenantSlug(tenantSlug);

  const rows = await controlDb
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
        eq(tenants.slug, resolvedTenantSlug),
        eq(tenants.status, "active"),
        isNull(tenants.deletedAt),
        eq(tenantDatabaseConnections.migrationStatus, "success"),
      ),
    )
    .limit(1);

  const connection = rows[0];

  if (!connection) {
    return null;
  }

  const databaseUrl = decryptSecret(connection.databaseUrlEncrypted);

  return {
    tenantId: connection.tenantId,
    tenantSlug: connection.tenantSlug,
    tenantName: connection.tenantName,
    db: getTenantDbByConnection({
      tenantId: connection.tenantId,
      databaseName: connection.databaseName,
      schemaVersion: Number(connection.schemaVersion ?? 0),
      databaseUrl,
    }),
  };
}