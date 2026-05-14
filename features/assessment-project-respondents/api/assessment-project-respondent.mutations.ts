import { and, eq, isNull } from "drizzle-orm";

import {
  assessmentProjectRespondents,
  assessmentProjects,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import type { TenantDb } from "@/server/db/tenant-db";
import type { TenantContext } from "@/server/tenant/tenant-context.types";

import {
  addAssessmentProjectRespondentSchema,
  archiveAssessmentProjectRespondentSchema,
  updateAssessmentProjectRespondentSchema,
  type AddAssessmentProjectRespondentInput,
  type ArchiveAssessmentProjectRespondentInput,
  type UpdateAssessmentProjectRespondentInput,
} from "../forms/assessment-project-respondent.schema";

async function ensureProjectExists({
  db,
  assessmentProjectId,
}: {
  db: TenantDb;
  assessmentProjectId: string;
}) {
  const project = await db.query.assessmentProjects.findFirst({
    where: and(
      eq(assessmentProjects.id, assessmentProjectId),
      isNull(assessmentProjects.deletedAt),
    ),
  });

  if (!project) {
    throw new Error("Assessment project not found.");
  }

  return project;
}

async function ensureRespondentExists({
  db,
  respondentId,
}: {
  db: TenantDb;
  respondentId: string;
}) {
  const respondent = await db.query.respondents.findFirst({
    where: and(eq(respondents.id, respondentId), isNull(respondents.deletedAt)),
  });

  if (!respondent) {
    throw new Error("Respondent not found.");
  }

  return respondent;
}

export async function addAssessmentProjectRespondent({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: AddAssessmentProjectRespondentInput;
}) {
  const parsed = addAssessmentProjectRespondentSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid project respondent input.");
  }

  await ensureProjectExists({
    db,
    assessmentProjectId: parsed.data.assessmentProjectId,
  });

  await ensureRespondentExists({
    db,
    respondentId: parsed.data.respondentId,
  });

  const existing = await db.query.assessmentProjectRespondents.findFirst({
    where: and(
      eq(
        assessmentProjectRespondents.assessmentProjectId,
        parsed.data.assessmentProjectId,
      ),
      eq(assessmentProjectRespondents.respondentId, parsed.data.respondentId),
      isNull(assessmentProjectRespondents.deletedAt),
    ),
  });

  if (existing) {
    throw new Error("Respondent is already assigned to this project.");
  }

  const [projectRespondent] = await db
    .insert(assessmentProjectRespondents)
    .values({
      assessmentProjectId: parsed.data.assessmentProjectId,
      respondentId: parsed.data.respondentId,
      status: "invited",
      invitedAt: new Date(),
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_project_respondent_added",
    entityType: "assessment_project_respondent",
    entityId: projectRespondent.id,
    after: {
      assessmentProjectId: projectRespondent.assessmentProjectId,
      respondentId: projectRespondent.respondentId,
      status: projectRespondent.status,
    },
  });

  return projectRespondent;
}

export async function updateAssessmentProjectRespondent({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: UpdateAssessmentProjectRespondentInput;
}) {
  const parsed = updateAssessmentProjectRespondentSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid project respondent update input.");
  }

  const existing = await db.query.assessmentProjectRespondents.findFirst({
    where: and(
      eq(assessmentProjectRespondents.id, parsed.data.projectRespondentId),
      eq(
        assessmentProjectRespondents.assessmentProjectId,
        parsed.data.assessmentProjectId,
      ),
      isNull(assessmentProjectRespondents.deletedAt),
    ),
  });

  if (!existing) {
    throw new Error("Project respondent not found.");
  }

  const now = new Date();

  const [updated] = await db
    .update(assessmentProjectRespondents)
    .set({
      status: parsed.data.status,
      startedAt:
        parsed.data.status === "started" && !existing.startedAt
          ? now
          : existing.startedAt,
      completedAt:
        parsed.data.status === "completed" && !existing.completedAt
          ? now
          : existing.completedAt,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(eq(assessmentProjectRespondents.id, parsed.data.projectRespondentId))
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_project_respondent_updated",
    entityType: "assessment_project_respondent",
    entityId: updated.id,
    before: {
      status: existing.status,
      startedAt: existing.startedAt,
      completedAt: existing.completedAt,
    },
    after: {
      status: updated.status,
      startedAt: updated.startedAt,
      completedAt: updated.completedAt,
    },
  });

  return updated;
}

export async function archiveAssessmentProjectRespondent({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: ArchiveAssessmentProjectRespondentInput;
}) {
  const parsed = archiveAssessmentProjectRespondentSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid project respondent archive input.");
  }

  const existing = await db.query.assessmentProjectRespondents.findFirst({
    where: and(
      eq(assessmentProjectRespondents.id, parsed.data.projectRespondentId),
      eq(
        assessmentProjectRespondents.assessmentProjectId,
        parsed.data.assessmentProjectId,
      ),
      isNull(assessmentProjectRespondents.deletedAt),
    ),
  });

  if (!existing) {
    throw new Error("Project respondent not found.");
  }

  const [archived] = await db
    .update(assessmentProjectRespondents)
    .set({
      status: "archived",
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(assessmentProjectRespondents.id, parsed.data.projectRespondentId))
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_project_respondent_archived",
    entityType: "assessment_project_respondent",
    entityId: archived.id,
    before: {
      status: existing.status,
    },
    after: {
      status: archived.status,
      deletedAt: archived.deletedAt,
    },
  });

  return archived;
}