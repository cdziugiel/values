// features/assessment-project-questionnaires/api/assessment-project-questionnaire.mutations.ts
// features/assessment-project-questionnaires/api/assessment-project-questionnaire.mutations.ts
import { and, desc, eq, isNull } from "drizzle-orm";

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

async function getNextProjectQuestionnaireOrderIndex({
  db,
  assessmentProjectId,
}: {
  db: TenantDb;
  assessmentProjectId: string;
}) {
  const lastAssignment =
    await db.query.assessmentProjectQuestionnaires.findFirst({
      where: and(
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          assessmentProjectId,
        ),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
      orderBy: desc(assessmentProjectQuestionnaires.orderIndex),
      columns: {
        orderIndex: true,
      },
    });

  return (lastAssignment?.orderIndex ?? -1) + 1;
}

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

  /**
   * Biznesowo: w jednym projekcie trzymamy najwyżej jedną wersję danego
   * kwestionariusza. Jeżeli chcesz kiedyś dopuścić porównywanie wersji v2/v3
   * w jednym projekcie, usuń ten blok i zostaw tylko kontrolę po versionId.
   */
  const existingSameQuestionnaire =
    await db.query.assessmentProjectQuestionnaires.findFirst({
      where: and(
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          parsed.data.assessmentProjectId,
        ),
        eq(
          assessmentProjectQuestionnaires.questionnaireId,
          parsed.data.questionnaireId,
        ),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    });

  if (existingSameQuestionnaire) {
    throw new Error(
      "Ten kwestionariusz jest już przypisany do tego badania. Usuń istniejące przypisanie albo wybierz inny kwestionariusz.",
    );
  }

  /**
   * Jeżeli ta sama wersja była kiedyś dodana i zarchiwizowana, przywracamy ją,
   * zamiast tworzyć drugi rekord, który może naruszyć unikalne indeksy.
   */
  const archivedSameVersion =
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
      ),
    });

  const now = new Date();
  const orderIndex = await getNextProjectQuestionnaireOrderIndex({
    db,
    assessmentProjectId: parsed.data.assessmentProjectId,
  });

  if (archivedSameVersion?.deletedAt) {
    const [restored] = await db
      .update(assessmentProjectQuestionnaires)
      .set({
        questionnaireId: parsed.data.questionnaireId,
        questionnaireVersionId: parsed.data.questionnaireVersionId,
        orderIndex,
        status: "active",
        deletedAt: null,
        updatedBy: ctx.userId,
        updatedAt: now,
      })
      .where(eq(assessmentProjectQuestionnaires.id, archivedSameVersion.id))
      .returning();

    await writeTenantAuditLog({
      db,
      ctx,
      action: "assessment_project_questionnaire_restored",
      entityType: "assessment_project_questionnaire",
      entityId: restored.id,
      before: {
        status: archivedSameVersion.status,
        deletedAt: archivedSameVersion.deletedAt,
      },
      after: {
        assessmentProjectId: restored.assessmentProjectId,
        questionnaireId: restored.questionnaireId,
        questionnaireVersionId: restored.questionnaireVersionId,
        orderIndex: restored.orderIndex,
        status: restored.status,
        deletedAt: restored.deletedAt,
      },
    });

    return restored;
  }

  const [projectQuestionnaire] = await db
    .insert(assessmentProjectQuestionnaires)
    .values({
      assessmentProjectId: parsed.data.assessmentProjectId,
      questionnaireId: parsed.data.questionnaireId,
      questionnaireVersionId: parsed.data.questionnaireVersionId,
      orderIndex,
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
      orderIndex: projectQuestionnaire.orderIndex,
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
      orderIndex: existing.orderIndex,
    },
    after: {
      status: archived.status,
      deletedAt: archived.deletedAt,
    },
  });

  return archived;
}