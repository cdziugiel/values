import { and, eq, isNull } from "drizzle-orm";

import {
  assessmentProjectQuestionnaires,
  assessmentProjects,
} from "@/drizzle/schema/tenant-schema";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import type { TenantDb } from "@/server/db/tenant-db";
import type { TenantContext } from "@/server/tenant/tenant-context.types";

import {
  addAssessmentProjectQuestionnaireSchema,
  archiveAssessmentProjectQuestionnaireSchema,
  type AddAssessmentProjectQuestionnaireInput,
  type ArchiveAssessmentProjectQuestionnaireInput,
} from "../forms/assessment-project-questionnaire.schema";

export async function addAssessmentProjectQuestionnaire({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: AddAssessmentProjectQuestionnaireInput;
}) {
  const parsed = addAssessmentProjectQuestionnaireSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid assessment project questionnaire input.");
  }

  const project = await db.query.assessmentProjects.findFirst({
    where: and(
      eq(assessmentProjects.id, parsed.data.assessmentProjectId),
      isNull(assessmentProjects.deletedAt),
    ),
  });

  if (!project) {
    throw new Error("Assessment project not found.");
  }

  const existing =
    await db.query.assessmentProjectQuestionnaires.findFirst({
      where: and(
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          parsed.data.assessmentProjectId,
        ),
        eq(
          assessmentProjectQuestionnaires.questionnaireVersionId,
          parsed.data.questionnaireVersionId,
        ),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    });

  if (existing) {
    throw new Error("Questionnaire version is already assigned to this project.");
  }

  const [projectQuestionnaire] = await db
    .insert(assessmentProjectQuestionnaires)
    .values({
      assessmentProjectId: parsed.data.assessmentProjectId,
      questionnaireId: parsed.data.questionnaireId,
      questionnaireVersionId: parsed.data.questionnaireVersionId,
      status: "active",
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_project_questionnaire_added",
    entityType: "assessment_project_questionnaire",
    entityId: projectQuestionnaire.id,
    after: {
      assessmentProjectId: projectQuestionnaire.assessmentProjectId,
      questionnaireId: projectQuestionnaire.questionnaireId,
      questionnaireVersionId: projectQuestionnaire.questionnaireVersionId,
      status: projectQuestionnaire.status,
    },
  });

  return projectQuestionnaire;
}

export async function archiveAssessmentProjectQuestionnaire({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: ArchiveAssessmentProjectQuestionnaireInput;
}) {
  const parsed = archiveAssessmentProjectQuestionnaireSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid archive assessment project questionnaire input.");
  }

  const existing =
    await db.query.assessmentProjectQuestionnaires.findFirst({
      where: and(
        eq(
          assessmentProjectQuestionnaires.id,
          parsed.data.projectQuestionnaireId,
        ),
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          parsed.data.assessmentProjectId,
        ),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    });

  if (!existing) {
    throw new Error("Project questionnaire not found.");
  }

  const now = new Date();

  const [archived] = await db
    .update(assessmentProjectQuestionnaires)
    .set({
      status: "archived",
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      eq(
        assessmentProjectQuestionnaires.id,
        parsed.data.projectQuestionnaireId,
      ),
    )
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_project_questionnaire_archived",
    entityType: "assessment_project_questionnaire",
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