// features/assessment-projects/api/assessment-project.mutations.ts
import { and, eq, isNull } from "drizzle-orm";

import {
  assessmentProjects,
  clientOrganizations,
} from "@/drizzle/schema/tenant-schema";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import type { TenantDb } from "@/server/db/tenant-db";
import type { TenantContext } from "@/server/tenant/tenant-context.types";
import { syncAssessmentInvitationIndexForProject } from "@/features/my-assessment/api/assessment-invitation-index.mutations";
import {
  archiveAssessmentProjectSchema,
  createAssessmentProjectSchema,
  updateAssessmentProjectSchema,
  type ArchiveAssessmentProjectInput,
  type CreateAssessmentProjectInput,
  type UpdateAssessmentProjectInput,
} from "../forms/assessment-project.schema";

function parseOptionalDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }

  return date;
}

async function ensureClientOrganizationExists({
  db,
  clientOrganizationId,
}: {
  db: TenantDb;
  clientOrganizationId: string | null;
}) {
  if (!clientOrganizationId) return null;

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

function normalizeClientOrganizationId(value: string | undefined | null) {
  return value?.trim() ? value : null;
}

function assertProjectDates(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new Error("Project end date cannot be earlier than start date.");
  }
}

export async function createAssessmentProject({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: CreateAssessmentProjectInput;
}) {
  const parsed = createAssessmentProjectSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid assessment project input.");
  }

  const clientOrganizationId = normalizeClientOrganizationId(
    parsed.data.clientOrganizationId,
  );

  await ensureClientOrganizationExists({
    db,
    clientOrganizationId,
  });

  const startsAt = parseOptionalDate(parsed.data.startsAt);
  const endsAt = parseOptionalDate(parsed.data.endsAt);

  assertProjectDates(startsAt, endsAt);

  const [project] = await db
    .insert(assessmentProjects)
    .values({
      clientOrganizationId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      status: "draft",
      startsAt,
      endsAt,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_project_created",
    entityType: "assessment_project",
    entityId: project.id,
    after: {
      clientOrganizationId: project.clientOrganizationId,
      name: project.name,
      status: project.status,
      startsAt: project.startsAt,
      endsAt: project.endsAt,
    },
  });

  return project;
}

export async function updateAssessmentProject({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: UpdateAssessmentProjectInput;
}) {
  const parsed = updateAssessmentProjectSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid assessment project update input.");
  }

  const existingProject = await db.query.assessmentProjects.findFirst({
    where: and(
      eq(assessmentProjects.id, parsed.data.assessmentProjectId),
      isNull(assessmentProjects.deletedAt),
    ),
  });

  if (!existingProject) {
    throw new Error("Assessment project not found.");
  }

  const clientOrganizationId = normalizeClientOrganizationId(
    parsed.data.clientOrganizationId,
  );

  await ensureClientOrganizationExists({
    db,
    clientOrganizationId,
  });

  const startsAt = parseOptionalDate(parsed.data.startsAt);
  const endsAt = parseOptionalDate(parsed.data.endsAt);

  assertProjectDates(startsAt, endsAt);

  const [updatedProject] = await db
    .update(assessmentProjects)
    .set({
      clientOrganizationId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      status: parsed.data.status,
      startsAt,
      endsAt,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(assessmentProjects.id, parsed.data.assessmentProjectId))
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_project_updated",
    entityType: "assessment_project",
    entityId: updatedProject.id,
    before: {
      clientOrganizationId: existingProject.clientOrganizationId,
      name: existingProject.name,
      description: existingProject.description,
      status: existingProject.status,
      startsAt: existingProject.startsAt,
      endsAt: existingProject.endsAt,
    },
    after: {
      clientOrganizationId: updatedProject.clientOrganizationId,
      name: updatedProject.name,
      description: updatedProject.description,
      status: updatedProject.status,
      startsAt: updatedProject.startsAt,
      endsAt: updatedProject.endsAt,
    },
  });
  await syncAssessmentInvitationIndexForProject({
    db,
    ctx,
    assessmentProjectId: updatedProject.id,
  });
  return updatedProject;
}

export async function archiveAssessmentProject({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: ArchiveAssessmentProjectInput;
}) {
  const parsed = archiveAssessmentProjectSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid assessment project archive input.");
  }

  const existingProject = await db.query.assessmentProjects.findFirst({
    where: and(
      eq(assessmentProjects.id, parsed.data.assessmentProjectId),
      isNull(assessmentProjects.deletedAt),
    ),
  });

  if (!existingProject) {
    throw new Error("Assessment project not found.");
  }

  const [archivedProject] = await db
    .update(assessmentProjects)
    .set({
      status: "archived",
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(assessmentProjects.id, parsed.data.assessmentProjectId))
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_project_archived",
    entityType: "assessment_project",
    entityId: archivedProject.id,
    before: {
      name: existingProject.name,
      status: existingProject.status,
    },
    after: {
      name: archivedProject.name,
      status: archivedProject.status,
      deletedAt: archivedProject.deletedAt,
    },
  });
  await syncAssessmentInvitationIndexForProject({
    db,
    ctx,
    assessmentProjectId: archivedProject.id,
  });
  return archivedProject;
}