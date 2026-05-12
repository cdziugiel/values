import { desc, eq } from "drizzle-orm";

import {
  tenantDatabaseConnections,
  tenantMemberships,
  tenants,
  users,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import type { SystemTenantListItem } from "../types/tenant-admin.types";

export async function listSystemTenants(): Promise<SystemTenantListItem[]> {
  const rows = await controlDb
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      status: tenants.status,
      createdAt: tenants.createdAt,

      databaseName: tenantDatabaseConnections.databaseName,
      migrationStatus: tenantDatabaseConnections.migrationStatus,
      schemaVersion: tenantDatabaseConnections.schemaVersion,
      lastMigratedAt: tenantDatabaseConnections.lastMigratedAt,
    })
    .from(tenants)
    .leftJoin(
      tenantDatabaseConnections,
      eq(tenantDatabaseConnections.tenantId, tenants.id),
    )
    .orderBy(desc(tenants.createdAt));

  const ownerRows = await controlDb
    .select({
      tenantId: tenantMemberships.tenantId,
      ownerEmail: users.email,
    })
    .from(tenantMemberships)
    .innerJoin(users, eq(users.id, tenantMemberships.userId))
    .where(eq(tenantMemberships.role, "TENANT_OWNER"));

  const ownerByTenantId = new Map<string, string>();

  for (const row of ownerRows) {
    if (!ownerByTenantId.has(row.tenantId)) {
      ownerByTenantId.set(row.tenantId, row.ownerEmail);
    }
  }

  return rows.map((row) => ({
    ...row,
    ownerEmail: ownerByTenantId.get(row.id) ?? null,
  }));
}