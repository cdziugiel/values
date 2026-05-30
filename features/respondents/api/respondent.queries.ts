import { and, asc, eq, isNull } from "drizzle-orm";

import {
  clientOrganizations,
  clientUnitMemberships,
  clientUnits,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";

import type {
  RespondentListItem,
  RespondentOrganizationOption,
  RespondentUnitOption,
} from "../types/respondent.types";

export async function listRespondentOrganizations(
  db: TenantDb,
): Promise<RespondentOrganizationOption[]> {
  return db
    .select({
      id: clientOrganizations.id,
      name: clientOrganizations.name,
    })
    .from(clientOrganizations)
    .where(isNull(clientOrganizations.deletedAt))
    .orderBy(asc(clientOrganizations.name));
}

export async function listRespondentUnits(
  db: TenantDb,
): Promise<RespondentUnitOption[]> {
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

export async function listRespondents(
  db: TenantDb,
): Promise<RespondentListItem[]> {
  const rows = await db
    .select({
      id: respondents.id,
      externalCode: respondents.externalCode,
      clientOrganizationId: respondents.clientOrganizationId,
      clientOrganizationName: clientOrganizations.name,
      clientUnitId: respondents.clientUnitId,
      clientUnitName: clientUnits.name,

      clientUnitRole: clientUnitMemberships.role,
      isLeader: clientUnitMemberships.isLeader,

      email: respondentIdentities.email,
      firstName: respondentIdentities.firstName,
      lastName: respondentIdentities.lastName,
      phone: respondentIdentities.phone,
      createdAt: respondents.createdAt,
      updatedAt: respondents.updatedAt,
    })
    .from(respondents)
    .leftJoin(
      clientOrganizations,
      eq(clientOrganizations.id, respondents.clientOrganizationId),
    )
    .leftJoin(clientUnits, eq(clientUnits.id, respondents.clientUnitId))
    .leftJoin(
      clientUnitMemberships,
      and(
        eq(clientUnitMemberships.respondentId, respondents.id),
        eq(clientUnitMemberships.clientUnitId, respondents.clientUnitId),
        isNull(clientUnitMemberships.deletedAt),
      ),
    )
    .leftJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, respondents.id),
    )
    .where(isNull(respondents.deletedAt))
    .orderBy(asc(respondentIdentities.lastName), asc(respondentIdentities.email));

  return rows.map((row) => ({
    ...row,
    clientUnitRole: row.clientUnitRole ?? null,
    isLeader: Boolean(row.isLeader),
  }));
}