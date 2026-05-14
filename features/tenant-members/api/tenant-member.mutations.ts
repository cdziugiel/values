import { and, eq, isNull } from "drizzle-orm";

import {
  systemAuditLog,
  tenantMemberships,
  tenants,
  users,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import {
  addTenantMemberSchema,
  archiveTenantMemberSchema,
  updateTenantMemberSchema,
  type AddTenantMemberInput,
  type ArchiveTenantMemberInput,
  type UpdateTenantMemberInput,
} from "../forms/tenant-member.schema";

async function getActiveTenantBySlug(tenantSlug: string) {
  const tenant = await controlDb.query.tenants.findFirst({
    where: and(
      eq(tenants.slug, tenantSlug),
      eq(tenants.status, "active"),
      isNull(tenants.deletedAt),
    ),
  });

  if (!tenant) {
    throw new Error("Tenant not found or inactive.");
  }

  return tenant;
}

async function findOrCreateUserByEmail({
  actorUserId,
  email,
  name,
}: {
  actorUserId: string;
  email: string;
  name?: string | null;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name?.trim() || null;

  const existingUser = await controlDb.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existingUser) {
    if (normalizedName && !existingUser.name) {
      const [updatedUser] = await controlDb
        .update(users)
        .set({
          name: normalizedName,
          updatedBy: actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      return updatedUser;
    }

    return existingUser;
  }

  const [createdUser] = await controlDb
    .insert(users)
    .values({
      email: normalizedEmail,
      name: normalizedName ?? normalizedEmail,
      globalRole: "USER",
      status: "active",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  return createdUser;
}

export async function addTenantMember({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: AddTenantMemberInput;
}) {
  const parsed = addTenantMemberSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid tenant member input.");
  }

  const tenant = await getActiveTenantBySlug(parsed.data.tenantSlug);

  const user = await findOrCreateUserByEmail({
    actorUserId,
    email: parsed.data.email,
    name: parsed.data.name,
  });

  const existingMembership = await controlDb.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.tenantId, tenant.id),
      eq(tenantMemberships.userId, user.id),
      isNull(tenantMemberships.deletedAt),
    ),
  });

  if (existingMembership) {
    const [updatedMembership] = await controlDb
      .update(tenantMemberships)
      .set({
        role: parsed.data.role,
        status: "active",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(tenantMemberships.id, existingMembership.id))
      .returning();

    await controlDb.insert(systemAuditLog).values({
      actorUserId,
      tenantId: tenant.id,
      actorRole: "TENANT_ADMIN",
      action: "tenant_member_reactivated",
      entityType: "tenant_membership",
      entityId: updatedMembership.id,
      before: {
        role: existingMembership.role,
        status: existingMembership.status,
      },
      after: {
        userId: user.id,
        email: user.email,
        role: updatedMembership.role,
        status: updatedMembership.status,
      },
    });

    return updatedMembership;
  }

  const [membership] = await controlDb
    .insert(tenantMemberships)
    .values({
      tenantId: tenant.id,
      userId: user.id,
      role: parsed.data.role,
      status: "active",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    tenantId: tenant.id,
    actorRole: "TENANT_ADMIN",
    action: "tenant_member_added",
    entityType: "tenant_membership",
    entityId: membership.id,
    after: {
      userId: user.id,
      email: user.email,
      role: membership.role,
      status: membership.status,
    },
  });

  return membership;
}

export async function updateTenantMember({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateTenantMemberInput;
}) {
  const parsed = updateTenantMemberSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid tenant member update input.");
  }

  const tenant = await getActiveTenantBySlug(parsed.data.tenantSlug);

  const existingMembership = await controlDb.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.id, parsed.data.membershipId),
      eq(tenantMemberships.tenantId, tenant.id),
      isNull(tenantMemberships.deletedAt),
    ),
  });

  if (!existingMembership) {
    throw new Error("Tenant membership not found.");
  }

  const [updatedMembership] = await controlDb
    .update(tenantMemberships)
    .set({
      role: parsed.data.role,
      status: parsed.data.status,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(tenantMemberships.id, parsed.data.membershipId))
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    tenantId: tenant.id,
    actorRole: "TENANT_ADMIN",
    action: "tenant_member_updated",
    entityType: "tenant_membership",
    entityId: updatedMembership.id,
    before: {
      role: existingMembership.role,
      status: existingMembership.status,
    },
    after: {
      role: updatedMembership.role,
      status: updatedMembership.status,
    },
  });

  return updatedMembership;
}

export async function archiveTenantMember({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: ArchiveTenantMemberInput;
}) {
  const parsed = archiveTenantMemberSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid tenant member archive input.");
  }

  const tenant = await getActiveTenantBySlug(parsed.data.tenantSlug);

  const existingMembership = await controlDb.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.id, parsed.data.membershipId),
      eq(tenantMemberships.tenantId, tenant.id),
      isNull(tenantMemberships.deletedAt),
    ),
  });

  if (!existingMembership) {
    throw new Error("Tenant membership not found.");
  }

  const [archivedMembership] = await controlDb
    .update(tenantMemberships)
    .set({
      status: "removed",
      deletedAt: new Date(),
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(tenantMemberships.id, parsed.data.membershipId))
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    tenantId: tenant.id,
    actorRole: "TENANT_ADMIN",
    action: "tenant_member_archived",
    entityType: "tenant_membership",
    entityId: archivedMembership.id,
    before: {
      role: existingMembership.role,
      status: existingMembership.status,
    },
    after: {
      role: archivedMembership.role,
      status: archivedMembership.status,
      deletedAt: archivedMembership.deletedAt,
    },
  });

  return archivedMembership;
}