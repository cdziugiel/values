import { desc, eq } from "drizzle-orm";

import { tenantDatabaseConnections, tenants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export type TenantMigrationListItem = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
  databaseName: string | null;
  migrationStatus: string | null;
  schemaVersion: number | null;
  lastMigratedAt: Date | null;
  updatedAt: Date | null;
};

export async function listTenantMigrationStatuses(): Promise<
  TenantMigrationListItem[]
> {
  return controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      tenantStatus: tenants.status,
      databaseName: tenantDatabaseConnections.databaseName,
      migrationStatus: tenantDatabaseConnections.migrationStatus,
      schemaVersion: tenantDatabaseConnections.schemaVersion,
      lastMigratedAt: tenantDatabaseConnections.lastMigratedAt,
      updatedAt: tenantDatabaseConnections.updatedAt,
    })
    .from(tenants)
    .leftJoin(
      tenantDatabaseConnections,
      eq(tenantDatabaseConnections.tenantId, tenants.id),
    )
    .orderBy(desc(tenants.createdAt));
}