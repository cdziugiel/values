import { and, eq, isNull } from "drizzle-orm";

import {
  questionnaireDimensions,
  questionnaireItemDimensionScores,
  questionnaireItems,
  questionnairePages,
  questionnaires,
  questionnaireVersions,
  systemAuditLog,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import {
  assignItemDimensionSchema,
  createQuestionnaireDimensionSchema,
  createQuestionnaireItemSchema,
  createQuestionnairePageSchema,
  createQuestionnaireSchema,
  createQuestionnaireVersionSchema,
  removeItemDimensionSchema,
  updateQuestionnaireDimensionSchema,
  updateQuestionnaireItemSchema,
  updateQuestionnairePageSchema,
  updateQuestionnaireSchema,
  updateQuestionnaireVersionSchema,
  type AssignItemDimensionInput,
  type CreateQuestionnaireDimensionInput,
  type CreateQuestionnaireInput,
  type CreateQuestionnaireItemInput,
  type CreateQuestionnairePageInput,
  type CreateQuestionnaireVersionInput,
  type RemoveItemDimensionInput,
  type UpdateQuestionnaireDimensionInput,
  type UpdateQuestionnaireInput,
  type UpdateQuestionnaireItemInput,
  type UpdateQuestionnairePageInput,
  type UpdateQuestionnaireVersionInput,
} from "../forms/questionnaire-admin.schema";

function nullIfEmpty(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function nullableUuid(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function nullableInt(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    return null;
  }

  return numberValue;
}

export async function createQuestionnaireAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CreateQuestionnaireInput;
}) {
  const parsed = createQuestionnaireSchema.parse(input);

  const [questionnaire] = await controlDb
    .insert(questionnaires)
    .values({
      code: parsed.code.trim().toUpperCase(),
      name: parsed.name.trim(),
      description: nullIfEmpty(parsed.description),
      status: "draft",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    actorRole: "SUPER_ADMIN",
    action: "questionnaire_created",
    entityType: "questionnaire",
    entityId: questionnaire.id,
    after: {
      code: questionnaire.code,
      name: questionnaire.name,
      status: questionnaire.status,
    },
  });

  return questionnaire;
}

export async function updateQuestionnaireAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateQuestionnaireInput;
}) {
  const parsed = updateQuestionnaireSchema.parse(input);

  const existing = await controlDb.query.questionnaires.findFirst({
    where: and(
      eq(questionnaires.id, parsed.questionnaireId),
      isNull(questionnaires.deletedAt),
    ),
  });

  if (!existing) {
    throw new Error("Questionnaire not found.");
  }

  const [updated] = await controlDb
    .update(questionnaires)
    .set({
      code: parsed.code.trim().toUpperCase(),
      name: parsed.name.trim(),
      description: nullIfEmpty(parsed.description),
      status: parsed.status,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(questionnaires.id, parsed.questionnaireId))
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    actorRole: "SUPER_ADMIN",
    action: "questionnaire_updated",
    entityType: "questionnaire",
    entityId: updated.id,
    before: {
      code: existing.code,
      name: existing.name,
      status: existing.status,
    },
    after: {
      code: updated.code,
      name: updated.name,
      status: updated.status,
    },
  });

  return updated;
}

export async function createQuestionnaireVersionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CreateQuestionnaireVersionInput;
}) {
  const parsed = createQuestionnaireVersionSchema.parse(input);

  const [version] = await controlDb
    .insert(questionnaireVersions)
    .values({
      questionnaireId: parsed.questionnaireId,
      version: parsed.version.trim(),
      name: parsed.name.trim(),
      description: nullIfEmpty(parsed.description),
      status: "draft",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    actorRole: "SUPER_ADMIN",
    action: "questionnaire_version_created",
    entityType: "questionnaire_version",
    entityId: version.id,
    after: {
      questionnaireId: version.questionnaireId,
      version: version.version,
      name: version.name,
      status: version.status,
    },
  });

  return version;
}

export async function updateQuestionnaireVersionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateQuestionnaireVersionInput;
}) {
  const parsed = updateQuestionnaireVersionSchema.parse(input);

  const existing = await controlDb.query.questionnaireVersions.findFirst({
    where: and(
      eq(questionnaireVersions.id, parsed.versionId),
      isNull(questionnaireVersions.deletedAt),
    ),
  });

  if (!existing) {
    throw new Error("Questionnaire version not found.");
  }

  const [updated] = await controlDb
    .update(questionnaireVersions)
    .set({
      name: parsed.name.trim(),
      description: nullIfEmpty(parsed.description),
      status: parsed.status,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(questionnaireVersions.id, parsed.versionId))
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    actorRole: "SUPER_ADMIN",
    action: "questionnaire_version_updated",
    entityType: "questionnaire_version",
    entityId: updated.id,
    before: {
      name: existing.name,
      status: existing.status,
    },
    after: {
      name: updated.name,
      status: updated.status,
    },
  });

  return updated;
}

export async function createQuestionnairePageAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CreateQuestionnairePageInput;
}) {
  const parsed = createQuestionnairePageSchema.parse(input);

  const [page] = await controlDb
    .insert(questionnairePages)
    .values({
      questionnaireVersionId: parsed.versionId,
      code: parsed.code.trim(),
      title: parsed.title.trim(),
      description: nullIfEmpty(parsed.description),
      orderIndex: parsed.orderIndex,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  return page;
}

export async function updateQuestionnairePageAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateQuestionnairePageInput;
}) {
  const parsed = updateQuestionnairePageSchema.parse(input);

  const [page] = await controlDb
    .update(questionnairePages)
    .set({
      code: parsed.code.trim(),
      title: parsed.title.trim(),
      description: nullIfEmpty(parsed.description),
      orderIndex: parsed.orderIndex,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(questionnairePages.id, parsed.pageId))
    .returning();

  return page;
}

export async function createQuestionnaireDimensionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CreateQuestionnaireDimensionInput;
}) {
  const parsed = createQuestionnaireDimensionSchema.parse(input);

  const [dimension] = await controlDb
    .insert(questionnaireDimensions)
    .values({
      questionnaireVersionId: parsed.versionId,
      code: parsed.code.trim().toUpperCase(),
      name: parsed.name.trim(),
      description: nullIfEmpty(parsed.description),
      orderIndex: parsed.orderIndex,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  return dimension;
}

export async function updateQuestionnaireDimensionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateQuestionnaireDimensionInput;
}) {
  const parsed = updateQuestionnaireDimensionSchema.parse(input);

  const [dimension] = await controlDb
    .update(questionnaireDimensions)
    .set({
      code: parsed.code.trim().toUpperCase(),
      name: parsed.name.trim(),
      description: nullIfEmpty(parsed.description),
      orderIndex: parsed.orderIndex,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(questionnaireDimensions.id, parsed.dimensionId))
    .returning();

  return dimension;
}

export async function createQuestionnaireItemAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CreateQuestionnaireItemInput;
}) {
  const parsed = createQuestionnaireItemSchema.parse(input);

  const [item] = await controlDb
    .insert(questionnaireItems)
    .values({
      questionnaireVersionId: parsed.versionId,
      questionnairePageId: nullableUuid(parsed.pageId),
      code: parsed.code.trim(),
      orderIndex: parsed.orderIndex,
      type: parsed.type,
      text: parsed.text.trim(),
      helpText: nullIfEmpty(parsed.helpText),
      required: parsed.required,
      scaleMin: nullableInt(parsed.scaleMin),
      scaleMax: nullableInt(parsed.scaleMax),
      scaleMinLabel: nullIfEmpty(parsed.scaleMinLabel),
      scaleMaxLabel: nullIfEmpty(parsed.scaleMaxLabel),
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  return item;
}

export async function updateQuestionnaireItemAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateQuestionnaireItemInput;
}) {
  const parsed = updateQuestionnaireItemSchema.parse(input);

  const [item] = await controlDb
    .update(questionnaireItems)
    .set({
      questionnairePageId: nullableUuid(parsed.pageId),
      code: parsed.code.trim(),
      orderIndex: parsed.orderIndex,
      type: parsed.type,
      text: parsed.text.trim(),
      helpText: nullIfEmpty(parsed.helpText),
      required: parsed.required,
      scaleMin: nullableInt(parsed.scaleMin),
      scaleMax: nullableInt(parsed.scaleMax),
      scaleMinLabel: nullIfEmpty(parsed.scaleMinLabel),
      scaleMaxLabel: nullIfEmpty(parsed.scaleMaxLabel),
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(questionnaireItems.id, parsed.itemId))
    .returning();

  return item;
}

export async function assignItemDimensionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: AssignItemDimensionInput;
}) {
  const parsed = assignItemDimensionSchema.parse(input);

  const [score] = await controlDb
    .insert(questionnaireItemDimensionScores)
    .values({
      questionnaireItemId: parsed.itemId,
      questionnaireDimensionId: parsed.dimensionId,
      weight: String(parsed.weight),
      reverseScored: parsed.reverseScored,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  return score;
}

export async function removeItemDimensionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: RemoveItemDimensionInput;
}) {
  const parsed = removeItemDimensionSchema.parse(input);

  const now = new Date();

  const [removed] = await controlDb
    .update(questionnaireItemDimensionScores)
    .set({
      deletedAt: now,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .where(
      eq(
        questionnaireItemDimensionScores.id,
        parsed.itemDimensionScoreId,
      ),
    )
    .returning();

  return removed;
}