import { and, asc, desc, eq, isNull, notInArray } from "drizzle-orm";

import {
  assessmentProjectRespondents,
  clientOrganizations,
  clientUnits,
  respondentIdentities,
  respondents,
  assessmentAccessLinks,
  assessmentSessions,
} from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";

import { buildAssessmentAccessUrl } from "@/features/assessment-access-links/lib/assessment-access-link-url";

import type {
  AssessmentProjectRespondentListItem,
  AssessmentProjectRespondentOption,
  AssessmentProjectRespondentOrganizationOption,
  AssessmentProjectRespondentUnitOption,
} from "../types/assessment-project-respondent.types";

export async function listAssessmentProjectRespondentOrganizationOptions({
  db,
}: {
  db: TenantDb;
}): Promise<AssessmentProjectRespondentOrganizationOption[]> {
  return db
    .select({
      id: clientOrganizations.id,
      name: clientOrganizations.name,
    })
    .from(clientOrganizations)
    .where(isNull(clientOrganizations.deletedAt))
    .orderBy(asc(clientOrganizations.name));
}

export async function listAssessmentProjectRespondentUnitOptions({
  db,
}: {
  db: TenantDb;
}): Promise<AssessmentProjectRespondentUnitOption[]> {
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
      activeAccessLinkId: assessmentAccessLinks.id,
      accessLinkExpiresAt: assessmentAccessLinks.expiresAt,
      createdAt: assessmentProjectRespondents.createdAt,
      updatedAt: assessmentProjectRespondents.updatedAt,
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      sessionStartedAt: assessmentSessions.startedAt,
      sessionCompletedAt: assessmentSessions.completedAt,
      
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
    .leftJoin(
      assessmentAccessLinks,
      and(
        eq(
          assessmentAccessLinks.projectRespondentId,
          assessmentProjectRespondents.id,
        ),
        eq(assessmentAccessLinks.status, "active"),
        isNull(assessmentAccessLinks.deletedAt),
      ),
    )
    .leftJoin(
      assessmentSessions,
      and(
        eq(
          assessmentSessions.projectRespondentId,
          assessmentProjectRespondents.id,
        ),
        isNull(assessmentSessions.deletedAt),
      ),
    )
    .where(
      and(
        eq(assessmentProjectRespondents.assessmentProjectId, assessmentProjectId),
        isNull(assessmentProjectRespondents.deletedAt),
        isNull(respondents.deletedAt),
      ),
    )
    .orderBy(
  asc(respondentIdentities.lastName),
  asc(respondentIdentities.email),
  desc(assessmentSessions.completedAt),
  desc(assessmentSessions.startedAt),
  desc(assessmentSessions.createdAt),
);

  const rowsByParticipantId = new Map<string, AssessmentProjectRespondentListItem>();

for (const row of rows as AssessmentProjectRespondentListItem[]) {
  const existing = rowsByParticipantId.get(row.id);

  if (!existing) {
    rowsByParticipantId.set(row.id, row);
    continue;
  }

  const existingScore =
    (existing.sessionStatus === "completed" ? 30 : 0) +
    (existing.sessionStatus === "in_progress" ? 20 : 0) +
    (existing.sessionId ? 10 : 0) +
    (existing.activeAccessLinkId ? 1 : 0);

  const rowScore =
    (row.sessionStatus === "completed" ? 30 : 0) +
    (row.sessionStatus === "in_progress" ? 20 : 0) +
    (row.sessionId ? 10 : 0) +
    (row.activeAccessLinkId ? 1 : 0);

  if (rowScore > existingScore) {
    rowsByParticipantId.set(row.id, row);
  }
}

return Array.from(rowsByParticipantId.values());
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