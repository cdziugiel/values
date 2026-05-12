import {
  systemAuditLog,
  tenantDatabaseConnections,
  tenantMemberships,
  tenants,
  users,
} from "@/drizzle/schema";
import { createTenantDatabase } from "@/server/db/create-tenant-database";
import { controlDb } from "@/server/db/control-db";
import { buildTenantDatabaseUrl } from "@/server/db/tenant-database-url";
import { normalizeTenantDatabaseName } from "@/server/db/tenant-database-naming";
import { runTenantMigrations } from "@/server/db/migrate-tenant-database";
import { encryptSecret } from "@/server/security/encryption";
import { and, eq, isNull } from "drizzle-orm";
import {
  createTenantSchema,
  type CreateTenantInput,
} from "../forms/create-tenant.schema";
import {
  archiveTenantSchema,
  updateTenantSchema,
  type ArchiveTenantInput,
  type UpdateTenantInput,
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

    await assignTenantOwnerByEmail({
      actorUserId,
      tenantId: tenant.id,
      ownerEmail: parsed.data.ownerEmail,
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
type UpdateTenantAsSuperAdminInput = {
  actorUserId: string;
  input: UpdateTenantInput;
};

export async function updateTenantAsSuperAdmin({
  actorUserId,
  input,
}: UpdateTenantAsSuperAdminInput) {
  const parsed = updateTenantSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid tenant update input.");
  }

  const existingTenant = await controlDb.query.tenants.findFirst({
    where: and(
      eq(tenants.id, parsed.data.tenantId),
      isNull(tenants.deletedAt),
    ),
  });

  if (!existingTenant) {
    throw new Error("Tenant not found.");
  }

  const [updatedTenant] = await controlDb
    .update(tenants)
    .set({
      name: parsed.data.name,
      status: parsed.data.status,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, parsed.data.tenantId))
    .returning();

  await assignTenantOwnerByEmail({
    actorUserId,
    tenantId: updatedTenant.id,
    ownerEmail: parsed.data.ownerEmail,
  });

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    tenantId: updatedTenant.id,
    actorRole: "SUPER_ADMIN",
    action: "tenant_updated",
    entityType: "tenant",
    entityId: updatedTenant.id,
    before: {
      name: existingTenant.name,
      status: existingTenant.status,
    },
    after: {
      name: updatedTenant.name,
      status: updatedTenant.status,
    },
  });

  return updatedTenant;
}

type ArchiveTenantAsSuperAdminInput = {
  actorUserId: string;
  input: ArchiveTenantInput;
};

export async function archiveTenantAsSuperAdmin({
  actorUserId,
  input,
}: ArchiveTenantAsSuperAdminInput) {
  const parsed = archiveTenantSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid tenant archive input.");
  }

  const existingTenant = await controlDb.query.tenants.findFirst({
    where: and(
      eq(tenants.id, parsed.data.tenantId),
      isNull(tenants.deletedAt),
    ),
  });

  if (!existingTenant) {
    throw new Error("Tenant not found.");
  }

  const [archivedTenant] = await controlDb
    .update(tenants)
    .set({
      status: "archived",
      deletedAt: new Date(),
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, parsed.data.tenantId))
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    tenantId: archivedTenant.id,
    actorRole: "SUPER_ADMIN",
    action: "tenant_archived",
    entityType: "tenant",
    entityId: archivedTenant.id,
    before: {
      slug: existingTenant.slug,
      name: existingTenant.name,
      status: existingTenant.status,
    },
    after: {
      slug: archivedTenant.slug,
      name: archivedTenant.name,
      status: archivedTenant.status,
      deletedAt: archivedTenant.deletedAt,
    },
  });



  return archivedTenant;
}



async function assignTenantOwnerByEmail({
  actorUserId,
  tenantId,
  ownerEmail,
}: {
  actorUserId: string;
  tenantId: string;
  ownerEmail?: string | null;
}) {
  const normalizedEmail = ownerEmail?.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const existingUser = await controlDb.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  const [ownerUser] = existingUser
    ? [existingUser]
    : await controlDb
      .insert(users)
      .values({
        email: normalizedEmail,
        name: normalizedEmail,
        globalRole: "USER",
        status: "active",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning();

  const existingOwnerMembership =
    await controlDb.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.userId, ownerUser.id),
        eq(tenantMemberships.tenantId, tenantId),
        isNull(tenantMemberships.deletedAt),
      ),
    });

  if (existingOwnerMembership) {
    await controlDb
      .update(tenantMemberships)
      .set({
        role: "TENANT_OWNER",
        status: "active",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(tenantMemberships.id, existingOwnerMembership.id));
  } else {
    await controlDb.insert(tenantMemberships).values({
      userId: ownerUser.id,
      tenantId,
      role: "TENANT_OWNER",
      status: "active",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
  }

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    tenantId,
    actorRole: "SUPER_ADMIN",
    action: "tenant_owner_assigned",
    entityType: "tenant",
    entityId: tenantId,
    after: {
      ownerUserId: ownerUser.id,
      ownerEmail: ownerUser.email,
    },
  });

  return ownerUser;
}

