import { asc, eq, isNull } from "drizzle-orm";

import {
  clientOrganizations,
  clientUnits,
} from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";

import type {
  ClientUnitListItem,
  ClientUnitOrganizationOption,
  ClientUnitParentOption,
} from "../types/client-unit.types";

export async function listClientUnitOrganizations(
  db: TenantDb,
): Promise<ClientUnitOrganizationOption[]> {
  return db
    .select({
      id: clientOrganizations.id,
      name: clientOrganizations.name,
    })
    .from(clientOrganizations)
    .where(isNull(clientOrganizations.deletedAt))
    .orderBy(asc(clientOrganizations.name));
}

export async function listClientUnitParentOptions(
  db: TenantDb,
): Promise<ClientUnitParentOption[]> {
  return db
    .select({
      id: clientUnits.id,
      name: clientUnits.name,
      clientOrganizationId: clientUnits.clientOrganizationId,
    })
    .from(clientUnits)
    .where(isNull(clientUnits.deletedAt))
    .orderBy(asc(clientUnits.name));
}

export async function listClientUnits(
  db: TenantDb,
): Promise<ClientUnitListItem[]> {
  const rows = await db
    .select({
      id: clientUnits.id,
      clientOrganizationId: clientUnits.clientOrganizationId,
      clientOrganizationName: clientOrganizations.name,
      parentId: clientUnits.parentId,
      name: clientUnits.name,
      type: clientUnits.type,
      createdAt: clientUnits.createdAt,
      updatedAt: clientUnits.updatedAt,
    })
    .from(clientUnits)
    .innerJoin(
      clientOrganizations,
      eq(clientOrganizations.id, clientUnits.clientOrganizationId),
    )
    .where(isNull(clientUnits.deletedAt))
    .orderBy(asc(clientOrganizations.name), asc(clientUnits.name));

  const nameById = new Map<string, string>();

  for (const row of rows) {
    nameById.set(row.id, row.name);
  }

  return rows.map((row) => ({
    ...row,
    parentName: row.parentId ? nameById.get(row.parentId) ?? null : null,
  })) as ClientUnitListItem[];
}