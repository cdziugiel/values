import { and, eq, isNull } from "drizzle-orm";

import { clientOrganizations } from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import type { TenantContext } from "@/server/tenant/tenant-context.types";

import {
  archiveClientOrganizationSchema,
  createClientOrganizationSchema,
  updateClientOrganizationSchema,
  type ArchiveClientOrganizationInput,
  type CreateClientOrganizationInput,
  type UpdateClientOrganizationInput,
} from "../forms/client-organization.schema";

export async function createClientOrganization({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: CreateClientOrganizationInput;
}) {
  const parsed = createClientOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid client organization input.");
  }

  const [organization] = await db
    .insert(clientOrganizations)
    .values({
      name: parsed.data.name.trim(),
      industry: parsed.data.industry?.trim() || null,
      size: parsed.data.size?.trim() || null,
      status: "active",
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "client_organization_created",
    entityType: "client_organization",
    entityId: organization.id,
    after: {
      name: organization.name,
      industry: organization.industry,
      size: organization.size,
      status: organization.status,
    },
  });

  return organization;
}

export async function updateClientOrganization({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: UpdateClientOrganizationInput;
}) {
  const parsed = updateClientOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid client organization update input.");
  }

  const existingOrganization = await db.query.clientOrganizations.findFirst({
    where: and(
      eq(clientOrganizations.id, parsed.data.clientOrganizationId),
      isNull(clientOrganizations.deletedAt),
    ),
  });

  if (!existingOrganization) {
    throw new Error("Client organization not found.");
  }

  const [updatedOrganization] = await db
    .update(clientOrganizations)
    .set({
      name: parsed.data.name.trim(),
      industry: parsed.data.industry?.trim() || null,
      size: parsed.data.size?.trim() || null,
      status: parsed.data.status,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(clientOrganizations.id, parsed.data.clientOrganizationId))
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "client_organization_updated",
    entityType: "client_organization",
    entityId: updatedOrganization.id,
    before: {
      name: existingOrganization.name,
      industry: existingOrganization.industry,
      size: existingOrganization.size,
      status: existingOrganization.status,
    },
    after: {
      name: updatedOrganization.name,
      industry: updatedOrganization.industry,
      size: updatedOrganization.size,
      status: updatedOrganization.status,
    },
  });

  return updatedOrganization;
}

export async function archiveClientOrganization({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: ArchiveClientOrganizationInput;
}) {
  const parsed = archiveClientOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid client organization archive input.");
  }

  const existingOrganization = await db.query.clientOrganizations.findFirst({
    where: and(
      eq(clientOrganizations.id, parsed.data.clientOrganizationId),
      isNull(clientOrganizations.deletedAt),
    ),
  });

  if (!existingOrganization) {
    throw new Error("Client organization not found.");
  }

  const [archivedOrganization] = await db
    .update(clientOrganizations)
    .set({
      status: "archived",
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(clientOrganizations.id, parsed.data.clientOrganizationId))
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "client_organization_archived",
    entityType: "client_organization",
    entityId: archivedOrganization.id,
    before: {
      name: existingOrganization.name,
      status: existingOrganization.status,
    },
    after: {
      name: archivedOrganization.name,
      status: archivedOrganization.status,
      deletedAt: archivedOrganization.deletedAt,
    },
  });

  return archivedOrganization;
}