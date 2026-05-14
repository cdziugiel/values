import { and, asc, eq, isNull, notInArray } from "drizzle-orm";

import {
  assessmentProjectRespondents,
  clientOrganizations,
  clientUnits,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";

import type {
  AssessmentProjectRespondentListItem,
  AssessmentProjectRespondentOption,
} from "../types/assessment-project-respondent.types";

export async function listAssessmentProjectRespondents({
  db,
  assessmentProjectId,
}: {
  db: TenantDb;
  assessmentProjectId: string;
}): Promise<AssessmentProjectRespondentListItem[]> {
  const rows = await db
    .select({
      id: assessmentProjectRespondents.id,
      assessmentProjectId: assessmentProjectRespondents.assessmentProjectId,
      respondentId: assessmentProjectRespondents.respondentId,
      status: assessmentProjectRespondents.status,
      invitedAt: assessmentProjectRespondents.invitedAt,
      startedAt: assessmentProjectRespondents.startedAt,
      completedAt: assessmentProjectRespondents.completedAt,
      email: respondentIdentities.email,
      firstName: respondentIdentities.firstName,
      lastName: respondentIdentities.lastName,
      externalCode: respondents.externalCode,
      clientOrganizationName: clientOrganizations.name,
      clientUnitName: clientUnits.name,
      createdAt: assessmentProjectRespondents.createdAt,
      updatedAt: assessmentProjectRespondents.updatedAt,
    })
    .from(assessmentProjectRespondents)
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentProjectRespondents.respondentId),
    )
    .leftJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, respondents.id),
    )
    .leftJoin(
      clientOrganizations,
      eq(clientOrganizations.id, respondents.clientOrganizationId),
    )
    .leftJoin(clientUnits, eq(clientUnits.id, respondents.clientUnitId))
    .where(
      and(
        eq(assessmentProjectRespondents.assessmentProjectId, assessmentProjectId),
        isNull(assessmentProjectRespondents.deletedAt),
        isNull(respondents.deletedAt),
      ),
    )
    .orderBy(asc(respondentIdentities.lastName), asc(respondentIdentities.email));

  return rows as AssessmentProjectRespondentListItem[];
}

export async function listRespondentOptionsForProject({
  db,
  assessmentProjectId,
}: {
  db: TenantDb;
  assessmentProjectId: string;
}): Promise<AssessmentProjectRespondentOption[]> {
  const assignedRows = await db
    .select({
      respondentId: assessmentProjectRespondents.respondentId,
    })
    .from(assessmentProjectRespondents)
    .where(
      and(
        eq(assessmentProjectRespondents.assessmentProjectId, assessmentProjectId),
        isNull(assessmentProjectRespondents.deletedAt),
      ),
    );

  const assignedIds = assignedRows.map((row) => row.respondentId);

  const whereCondition =
    assignedIds.length > 0
      ? and(isNull(respondents.deletedAt), notInArray(respondents.id, assignedIds))
      : isNull(respondents.deletedAt);

  const rows = await db
    .select({
      id: respondents.id,
      externalCode: respondents.externalCode,
      email: respondentIdentities.email,
      firstName: respondentIdentities.firstName,
      lastName: respondentIdentities.lastName,
    })
    .from(respondents)
    .leftJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, respondents.id),
    )
    .where(whereCondition)
    .orderBy(asc(respondentIdentities.lastName), asc(respondentIdentities.email));

  return rows.map((row) => {
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
    const label =
      name ||
      row.email ||
      row.externalCode ||
      `Respondent ${row.id.slice(0, 8)}`;

    return {
      id: row.id,
      label,
      email: row.email,
    };
  });
}