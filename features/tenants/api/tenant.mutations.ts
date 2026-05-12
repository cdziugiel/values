import { eq } from "drizzle-orm";

import {
  systemAuditLog,
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import { createTenantDatabase } from "@/server/db/create-tenant-database";
import { controlDb } from "@/server/db/control-db";
import { buildTenantDatabaseUrl } from "@/server/db/tenant-database-url";
import { normalizeTenantDatabaseName } from "@/server/db/tenant-database-naming";
import { runTenantMigrations } from "@/server/db/migrate-tenant-database";
import { encryptSecret } from "@/server/security/encryption";

import {
  createTenantSchema,
  type CreateTenantInput,
} from "../forms/create-tenant.schema";

type CreateTenantAsSuperAdminInput = {
  actorUserId: string;
  input: CreateTenantInput;
};

export async function createTenantAsSuperAdmin({
  actorUserId,
  input,
}: CreateTenantAsSuperAdminInput) {
  const parsed = createTenantSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid tenant input.");
  }

  const existingTenant = await controlDb.query.tenants.findFirst({
    where: eq(tenants.slug, parsed.data.slug),
    columns: {
      id: true,
    },
  });

  if (existingTenant) {
    throw new Error("Tenant with this slug already exists.");
  }

  const databaseName = normalizeTenantDatabaseName(parsed.data.slug);
  const databaseUrl = buildTenantDatabaseUrl({ databaseName });
  const encryptedDatabaseUrl = encryptSecret(databaseUrl);

  const [tenant] = await controlDb
    .insert(tenants)
    .values({
      slug: parsed.data.slug,
      name: parsed.data.name,
      status: "active",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  await controlDb.insert(tenantDatabaseConnections).values({
    tenantId: tenant.id,
    databaseName,
    databaseUrlEncrypted: encryptedDatabaseUrl,
    schemaVersion: 0,
    migrationStatus: "pending",
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  try {
    await controlDb
      .update(tenantDatabaseConnections)
      .set({
        migrationStatus: "running",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(tenantDatabaseConnections.tenantId, tenant.id));

    await createTenantDatabase(databaseName);

    await runTenantMigrations({
      databaseUrl,
    });

    await controlDb
      .update(tenantDatabaseConnections)
      .set({
        migrationStatus: "success",
        schemaVersion: 1,
        lastMigratedAt: new Date(),
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(tenantDatabaseConnections.tenantId, tenant.id));

    await controlDb.insert(systemAuditLog).values({
      actorUserId,
      tenantId: tenant.id,
      actorRole: "SUPER_ADMIN",
      action: "tenant_created",
      entityType: "tenant",
      entityId: tenant.id,
      after: {
        slug: tenant.slug,
        databaseName,
      },
    });

    return tenant;
  } catch (error) {
    await controlDb
      .update(tenantDatabaseConnections)
      .set({
        migrationStatus: "failed",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(tenantDatabaseConnections.tenantId, tenant.id));

    await controlDb.insert(systemAuditLog).values({
      actorUserId,
      tenantId: tenant.id,
      actorRole: "SUPER_ADMIN",
      action: "tenant_creation_failed",
      entityType: "tenant",
      entityId: tenant.id,
      after: {
        slug: tenant.slug,
        databaseName,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    });

    throw error;
  }
}