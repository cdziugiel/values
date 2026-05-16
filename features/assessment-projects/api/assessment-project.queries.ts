// features/assessment-projects/api/assessment-project.queries.ts
import { asc, eq, isNull } from "drizzle-orm";

import {
  assessmentProjects,
  clientOrganizations,
} from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";

import type {
  AssessmentProjectListItem,
  AssessmentProjectOrganizationOption,
} from "../types/assessment-project.types";

export async function listAssessmentProjectOrganizations(
  db: TenantDb,
): Promise<AssessmentProjectOrganizationOption[]> {
  return db
    .select({
      id: clientOrganizations.id,
      name: clientOrganizations.name,
    })
    .from(clientOrganizations)
    .where(isNull(clientOrganizations.deletedAt))
    .orderBy(asc(clientOrganizations.name));
}

export async function listAssessmentProjects(
  db: TenantDb,
): Promise<AssessmentProjectListItem[]> {
  const rows = await db
    .select({
      id: assessmentProjects.id,
      clientOrganizationId: assessmentProjects.clientOrganizationId,
      clientOrganizationName: clientOrganizations.name,
      name: assessmentProjects.name,
      description: assessmentProjects.description,
      status: assessmentProjects.status,
      startsAt: assessmentProjects.startsAt,
      endsAt: assessmentProjects.endsAt,
      createdAt: assessmentProjects.createdAt,
      updatedAt: assessmentProjects.updatedAt,
    })
    .from(assessmentProjects)
    .leftJoin(
      clientOrganizations,
      eq(clientOrganizations.id, assessmentProjects.clientOrganizationId),
    )
    .where(isNull(assessmentProjects.deletedAt))
    .orderBy(asc(assessmentProjects.name));

  return rows as AssessmentProjectListItem[];
}