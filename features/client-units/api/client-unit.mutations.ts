import { and, eq, isNull } from "drizzle-orm";

import {
  clientOrganizations,
  clientUnits,
} from "@/drizzle/schema/tenant-schema";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import type { TenantDb } from "@/server/db/tenant-db";
import type { TenantContext } from "@/server/tenant/tenant-context.types";

import {
  archiveClientUnitSchema,
  createClientUnitSchema,
  updateClientUnitSchema,
  type ArchiveClientUnitInput,
  type CreateClientUnitInput,
  type UpdateClientUnitInput,
} from "../forms/client-unit.schema";

async function ensureClientOrganizationExists({
  db,
  clientOrganizationId,
}: {
  db: TenantDb;
  clientOrganizationId: string;
}) {
  const organization = await db.query.clientOrganizations.findFirst({
    where: and(
      eq(clientOrganizations.id, clientOrganizationId),
      isNull(clientOrganizations.deletedAt),
    ),
  });

  if (!organization) {
    throw new Error("Client organization not found.");
  }

  return organization;
}

async function ensureParentIsValid({
  db,
  parentId,
  clientOrganizationId,
  currentUnitId,
}: {
  db: TenantDb;
  parentId?: string | null;
  clientOrganizationId: string;
  currentUnitId?: string | null;
}) {
  if (!parentId) {
    return null;
  }

  if (currentUnitId && parentId === currentUnitId) {
    throw new Error("Client unit cannot be its own parent.");
  }

  const parent = await db.query.clientUnits.findFirst({
    where: and(
      eq(clientUnits.id, parentId),
      eq(clientUnits.clientOrganizationId, clientOrganizationId),
      isNull(clientUnits.deletedAt),
    ),
  });

  if (!parent) {
    throw new Error("Parent client unit not found in selected organization.");
  }

  return parent;
}

export async function createClientUnit({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: CreateClientUnitInput;
}) {
  const parsed = createClientUnitSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid client unit input.");
  }

  await ensureClientOrganizationExists({
    db,
    clientOrganizationId: parsed.data.clientOrganizationId,
  });

  const parentId = parsed.data.parentId || null;

  await ensureParentIsValid({
    db,
    parentId,
    clientOrganizationId: parsed.data.clientOrganizationId,
  });

  const [unit] = await db
    .insert(clientUnits)
    .values({
      clientOrganizationId: parsed.data.clientOrganizationId,
      parentId,
      name: parsed.data.name.trim(),
      type: parsed.data.type,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "client_unit_created",
    entityType: "client_unit",
    entityId: unit.id,
    after: {
      clientOrganizationId: unit.clientOrganizationId,
      parentId: unit.parentId,
      name: unit.name,
      type: unit.type,
    },
  });

  return unit;
}

export async function updateClientUnit({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: UpdateClientUnitInput;
}) {
  const parsed = updateClientUnitSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid client unit update input.");
  }

  const existingUnit = await db.query.clientUnits.findFirst({
    where: and(
      eq(clientUnits.id, parsed.data.clientUnitId),
      isNull(clientUnits.deletedAt),
    ),
  });

  if (!existingUnit) {
    throw new Error("Client unit not found.");
  }

  await ensureClientOrganizationExists({
    db,
    clientOrganizationId: parsed.data.clientOrganizationId,
  });

  const parentId = parsed.data.parentId || null;

  await ensureParentIsValid({
    db,
    parentId,
    clientOrganizationId: parsed.data.clientOrganizationId,
    currentUnitId: parsed.data.clientUnitId,
  });

  const [updatedUnit] = await db
    .update(clientUnits)
    .set({
      clientOrganizationId: parsed.data.clientOrganizationId,
      parentId,
      name: parsed.data.name.trim(),
      type: parsed.data.type,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(clientUnits.id, parsed.data.clientUnitId))
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "client_unit_updated",
    entityType: "client_unit",
    entityId: updatedUnit.id,
    before: {
      clientOrganizationId: existingUnit.clientOrganizationId,
      parentId: existingUnit.parentId,
      name: existingUnit.name,
      type: existingUnit.type,
    },
    after: {
      clientOrganizationId: updatedUnit.clientOrganizationId,
      parentId: updatedUnit.parentId,
      name: updatedUnit.name,
      type: updatedUnit.type,
    },
  });

  return updatedUnit;
}

export async function archiveClientUnit({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: ArchiveClientUnitInput;
}) {
  const parsed = archiveClientUnitSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid client unit archive input.");
  }

  const existingUnit = await db.query.clientUnits.findFirst({
    where: and(
      eq(clientUnits.id, parsed.data.clientUnitId),
      isNull(clientUnits.deletedAt),
    ),
  });

  if (!existingUnit) {
    throw new Error("Client unit not found.");
  }

  const [archivedUnit] = await db
    .update(clientUnits)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(clientUnits.id, parsed.data.clientUnitId))
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "client_unit_archived",
    entityType: "client_unit",
    entityId: archivedUnit.id,
    before: {
      name: existingUnit.name,
      type: existingUnit.type,
    },
    after: {
      name: archivedUnit.name,
      type: archivedUnit.type,
      deletedAt: archivedUnit.deletedAt,
    },
  });

  return archivedUnit;
}