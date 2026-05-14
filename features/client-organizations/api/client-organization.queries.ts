import { asc, isNull } from "drizzle-orm";

import { clientOrganizations } from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";

import type { ClientOrganizationListItem } from "../types/client-organization.types";

export async function listClientOrganizations(
  db: TenantDb,
): Promise<ClientOrganizationListItem[]> {
  const rows = await db
    .select({
      id: clientOrganizations.id,
      name: clientOrganizations.name,
      industry: clientOrganizations.industry,
      size: clientOrganizations.size,
      status: clientOrganizations.status,
      createdAt: clientOrganizations.createdAt,
      updatedAt: clientOrganizations.updatedAt,
    })
    .from(clientOrganizations)
    .where(isNull(clientOrganizations.deletedAt))
    .orderBy(asc(clientOrganizations.name));

  return rows as ClientOrganizationListItem[];
}