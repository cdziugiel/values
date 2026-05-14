import { eq } from "drizzle-orm";

import { tenantDatabaseConnections, tenants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { buildTenantDatabaseUrl } from "@/server/db/tenant-database-url";
import { createTenantDatabase } from "@/server/db/create-tenant-database";
import { runTenantMigrations } from "@/server/db/migrate-tenant-database";
import { encryptSecret } from "@/server/security/encryption";

function buildTenantDatabaseName(slug: string) {
  return `humanet_tenant_${slug.replaceAll("-", "_")}`;
}

export async function reprovisionTenantDatabaseAsSuperAdmin({
  actorUserId,
  tenantId,
}: {
  actorUserId: string;
  tenantId: string;
}) {
  const tenant = await controlDb.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  const databaseName = buildTenantDatabaseName(tenant.slug);

  await createTenantDatabase(databaseName);

  const databaseUrl = buildTenantDatabaseUrl({
    databaseName,
  });

  const databaseUrlEncrypted = encryptSecret(databaseUrl);

  const existingConnection =
    await controlDb.query.tenantDatabaseConnections.findFirst({
      where: eq(tenantDatabaseConnections.tenantId, tenant.id),
    });

  if (existingConnection) {
    await controlDb
      .update(tenantDatabaseConnections)
      .set({
        databaseName,
        databaseUrlEncrypted,
        migrationStatus: "running",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(tenantDatabaseConnections.id, existingConnection.id));
  } else {
    await controlDb.insert(tenantDatabaseConnections).values({
      tenantId: tenant.id,
      databaseName,
      databaseUrlEncrypted,
      migrationStatus: "running",
      schemaVersion: 0,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
  }

  await runTenantMigrations({
    databaseUrl,
  });

  await controlDb
    .update(tenantDatabaseConnections)
    .set({
      migrationStatus: "success",
      schemaVersion: Number(existingConnection?.schemaVersion ?? 0) + 1,
      lastMigratedAt: new Date(),
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(tenantDatabaseConnections.tenantId, tenant.id));

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    databaseName,
  };
}