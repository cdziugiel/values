import { and, asc, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { max } from "drizzle-orm";
import { validateQuestionnaireVersionForPublishing } from "./questionnaire-version-publishing.validation";
import {
    questionnaireDimensions,
    questionnaireItemDimensionScores,
    questionnairePageDimensionScores,
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
    archiveQuestionnaireItemSchema,
    archiveQuestionnairePageSchema,
    archiveQuestionnaireDimensionSchema,
    reorderQuestionnairePageSchema,
    reorderQuestionnaireItemSchema,
    assignPageDimensionSchema,
    removePageDimensionSchema,
    publishQuestionnaireVersionSchema,
    cloneQuestionnaireVersionSchema,
    type CloneQuestionnaireVersionInput,
    type PublishQuestionnaireVersionInput,
    type ReorderQuestionnairePageInput,
    type ReorderQuestionnaireItemInput,
    type ArchiveQuestionnairePageInput,
    type ArchiveQuestionnaireDimensionInput,
    type ArchiveQuestionnaireItemInput,
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
    AssignPageDimensionInput,
    RemovePageDimensionInput,
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



function pad3(value: number) {
  return String(value).padStart(3, "0");
}

async function getNextPageOrderIndex(versionId: string) {
  const lastPage = await controlDb.query.questionnairePages.findFirst({
    where: and(
      eq(questionnairePages.questionnaireVersionId, versionId),
      isNull(questionnairePages.deletedAt),
    ),
    orderBy: desc(questionnairePages.orderIndex),
  });

  return (lastPage?.orderIndex ?? 0) + 1;
}

async function getNextItemOrderIndex(versionId: string) {
  const lastItem = await controlDb.query.questionnaireItems.findFirst({
    where: and(
      eq(questionnaireItems.questionnaireVersionId, versionId),
      isNull(questionnaireItems.deletedAt),
    ),
    orderBy: desc(questionnaireItems.orderIndex),
  });

  return (lastItem?.orderIndex ?? 0) + 1;
}

async function buildUniquePageCode(versionId: string, orderIndex: number) {
  let candidate = `PAGE_${pad3(orderIndex)}`;
  let suffix = 1;

  while (
    await controlDb.query.questionnairePages.findFirst({
      where: and(
        eq(questionnairePages.questionnaireVersionId, versionId),
        eq(questionnairePages.code, candidate),
        isNull(questionnairePages.deletedAt),
      ),
    })
  ) {
    suffix += 1;
    candidate = `PAGE_${pad3(orderIndex)}_${suffix}`;
  }

  return candidate;
}


async function attachPageDimensionToExistingItems({
  tx,
  actorUserId,
  pageId,
  dimensionId,
  weight,
  reverseScored,
}: {
  tx: any;
  actorUserId: string;
  pageId: string;
  dimensionId: string;
  weight: string;
  reverseScored: boolean;
}) {
  const pageItems = await tx
    .select({
      id: questionnaireItems.id,
    })
    .from(questionnaireItems)
    .where(
      and(
        eq(questionnaireItems.questionnairePageId, pageId),
        isNull(questionnaireItems.deletedAt),
      ),
    );

  for (const item of pageItems) {
    const existing = await tx.query.questionnaireItemDimensionScores.findFirst({
      where: and(
        eq(questionnaireItemDimensionScores.questionnaireItemId, item.id),
        eq(questionnaireItemDimensionScores.questionnaireDimensionId, dimensionId),
      ),
    });

    if (existing && !existing.deletedAt) {
      continue;
    }

    if (existing && existing.deletedAt) {
      await tx
        .update(questionnaireItemDimensionScores)
        .set({
          weight,
          reverseScored,
          deletedAt: null,
          updatedBy: actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(questionnaireItemDimensionScores.id, existing.id));

      continue;
    }

    await tx.insert(questionnaireItemDimensionScores).values({
      questionnaireItemId: item.id,
      questionnaireDimensionId: dimensionId,
      weight,
      reverseScored,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
  }
}

export async function assignPageDimensionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: AssignPageDimensionInput;
}) {
  const parsed = assignPageDimensionSchema.parse(input);
  const now = new Date();

  const existing =
    await controlDb.query.questionnairePageDimensionScores.findFirst({
      where: and(
        eq(
          questionnairePageDimensionScores.questionnairePageId,
          parsed.pageId,
        ),
        eq(
          questionnairePageDimensionScores.questionnaireDimensionId,
          parsed.dimensionId,
        ),
      ),
    });

  const result = await controlDb.transaction(async (tx) => {
    let pageScore;

    if (existing && !existing.deletedAt) {
      throw new Error("Ten wymiar jest już przypisany do tej strony.");
    }

    if (existing && existing.deletedAt) {
      const [restored] = await tx
        .update(questionnairePageDimensionScores)
        .set({
          weight: String(parsed.weight),
          reverseScored: parsed.reverseScored,
          deletedAt: null,
          updatedBy: actorUserId,
          updatedAt: now,
        })
        .where(eq(questionnairePageDimensionScores.id, existing.id))
        .returning();

      pageScore = restored;
    } else {
      const [created] = await tx
        .insert(questionnairePageDimensionScores)
        .values({
          questionnairePageId: parsed.pageId,
          questionnaireDimensionId: parsed.dimensionId,
          weight: String(parsed.weight),
          reverseScored: parsed.reverseScored,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .returning();

      pageScore = created;
    }

    await attachPageDimensionToExistingItems({
      tx,
      actorUserId,
      pageId: parsed.pageId,
      dimensionId: parsed.dimensionId,
      weight: String(parsed.weight),
      reverseScored: parsed.reverseScored,
    });

    return pageScore;
  });

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    actorRole: "SUPER_ADMIN",
    action: "questionnaire_page_dimension_score_assigned",
    entityType: "questionnaire_page_dimension_score",
    entityId: result.id,
    after: {
      questionnairePageId: result.questionnairePageId,
      questionnaireDimensionId: result.questionnaireDimensionId,
      weight: result.weight,
      reverseScored: result.reverseScored,
      propagatedToPageItems: true,
    },
  });

  return result;
}

export async function removePageDimensionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: RemovePageDimensionInput;
}) {
  const parsed = removePageDimensionSchema.parse(input);

  const now = new Date();

  const [removed] = await controlDb
    .update(questionnairePageDimensionScores)
    .set({
      deletedAt: now,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .where(
      eq(
        questionnairePageDimensionScores.id,
        parsed.pageDimensionScoreId,
      ),
    )
    .returning();

  return removed;
}

async function buildUniqueItemCode(versionId: string, orderIndex: number) {
  let candidate = `ITEM_${pad3(orderIndex)}`;
  let suffix = 1;

  while (
    await controlDb.query.questionnaireItems.findFirst({
      where: and(
        eq(questionnaireItems.questionnaireVersionId, versionId),
        eq(questionnaireItems.code, candidate),
        isNull(questionnaireItems.deletedAt),
      ),
    })
  ) {
    suffix += 1;
    candidate = `ITEM_${pad3(orderIndex)}_${suffix}`;
  }

  return candidate;
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

  const orderIndex = await getNextPageOrderIndex(parsed.versionId);
  const code = await buildUniquePageCode(parsed.versionId, orderIndex);

  const [page] = await controlDb
    .insert(questionnairePages)
    .values({
      questionnaireVersionId: parsed.versionId,
      code,
      title: parsed.title.trim(),
      description: nullIfEmpty(parsed.description),
      orderIndex,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    actorRole: "SUPER_ADMIN",
    action: "questionnaire_page_created",
    entityType: "questionnaire_page",
    entityId: page.id,
    after: {
      code: page.code,
      title: page.title,
      orderIndex: page.orderIndex,
    },
  });

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

  const existing = await controlDb.query.questionnairePages.findFirst({
    where: and(
      eq(questionnairePages.id, parsed.pageId),
      eq(questionnairePages.questionnaireVersionId, parsed.versionId),
      isNull(questionnairePages.deletedAt),
    ),
  });

  if (!existing) {
    throw new Error("Questionnaire page not found.");
  }

  const [page] = await controlDb
    .update(questionnairePages)
    .set({
      title: parsed.title.trim(),
      description: nullIfEmpty(parsed.description),
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



async function attachPageDimensionsToItem({
  tx,
  actorUserId,
  pageId,
  itemId,
}: {
  tx: any;
  actorUserId: string;
  pageId: string;
  itemId: string;
}) {
  const pageScores = await tx
    .select({
      questionnaireDimensionId:
        questionnairePageDimensionScores.questionnaireDimensionId,
      weight: questionnairePageDimensionScores.weight,
      reverseScored: questionnairePageDimensionScores.reverseScored,
    })
    .from(questionnairePageDimensionScores)
    .where(
      and(
        eq(questionnairePageDimensionScores.questionnairePageId, pageId),
        isNull(questionnairePageDimensionScores.deletedAt),
      ),
    );

  if (pageScores.length === 0) {
    return;
  }

  for (const pageScore of pageScores) {
    const existing = await tx.query.questionnaireItemDimensionScores.findFirst({
      where: and(
        eq(questionnaireItemDimensionScores.questionnaireItemId, itemId),
        eq(
          questionnaireItemDimensionScores.questionnaireDimensionId,
          pageScore.questionnaireDimensionId,
        ),
      ),
    });

    if (existing && !existing.deletedAt) {
      continue;
    }

    if (existing && existing.deletedAt) {
      await tx
        .update(questionnaireItemDimensionScores)
        .set({
          weight: pageScore.weight,
          reverseScored: pageScore.reverseScored,
          deletedAt: null,
          updatedBy: actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(questionnaireItemDimensionScores.id, existing.id));

      continue;
    }

    await tx.insert(questionnaireItemDimensionScores).values({
      questionnaireItemId: itemId,
      questionnaireDimensionId: pageScore.questionnaireDimensionId,
      weight: pageScore.weight,
      reverseScored: pageScore.reverseScored,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
  }
}



export async function createQuestionnaireItemAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CreateQuestionnaireItemInput;
}) {
  const parsed = createQuestionnaireItemSchema.parse(input);

  const orderIndex = await getNextItemOrderIndex(parsed.versionId);
  const code = await buildUniqueItemCode(parsed.versionId, orderIndex);
  const pageId = nullableUuid(parsed.pageId);
const answerConfig = buildItemAnswerConfig(parsed);
  const [item] = await controlDb.transaction(async (tx) => {
    const [createdItem] = await tx
      .insert(questionnaireItems)
      .values({
        questionnaireVersionId: parsed.versionId,
        questionnairePageId: pageId,
        code,
        orderIndex,
        type: parsed.type,
        text: parsed.text.trim(),
        helpText: nullIfEmpty(parsed.helpText),
        required: parsed.required,
scaleMin: answerConfig.scaleMin,
scaleMax: answerConfig.scaleMax,
scaleMinLabel: answerConfig.scaleMinLabel,
scaleMaxLabel: answerConfig.scaleMaxLabel,
options: answerConfig.options,
responseConfig: answerConfig.responseConfig,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning();

    if (pageId) {
      await attachPageDimensionsToItem({
        tx,
        actorUserId,
        pageId,
        itemId: createdItem.id,
      });
    }

    return [createdItem];
  });

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    actorRole: "SUPER_ADMIN",
    action: "questionnaire_item_created",
    entityType: "questionnaire_item",
    entityId: item.id,
    after: {
      code: item.code,
      orderIndex: item.orderIndex,
      pageId: item.questionnairePageId,
      type: item.type,
    },
  });

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

  const existing = await controlDb.query.questionnaireItems.findFirst({
    where: and(
      eq(questionnaireItems.id, parsed.itemId),
      eq(questionnaireItems.questionnaireVersionId, parsed.versionId),
      isNull(questionnaireItems.deletedAt),
    ),
  });

  if (!existing) {
    throw new Error("Questionnaire item not found.");
  }

  const pageId = nullableUuid(parsed.pageId);
const answerConfig = buildItemAnswerConfig(parsed);
  const [item] = await controlDb.transaction(async (tx) => {
    const [updatedItem] = await tx
      .update(questionnaireItems)
      .set({
        questionnairePageId: pageId,
        type: parsed.type,
        text: parsed.text.trim(),
        helpText: nullIfEmpty(parsed.helpText),
        required: parsed.required,
scaleMin: answerConfig.scaleMin,
scaleMax: answerConfig.scaleMax,
scaleMinLabel: answerConfig.scaleMinLabel,
scaleMaxLabel: answerConfig.scaleMaxLabel,
options: answerConfig.options,
responseConfig: answerConfig.responseConfig,
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(questionnaireItems.id, parsed.itemId))
      .returning();

    if (pageId && existing.questionnairePageId !== pageId) {
      await attachPageDimensionsToItem({
        tx,
        actorUserId,
        pageId,
        itemId: updatedItem.id,
      });
    }

    return [updatedItem];
  });

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

    const existing = await controlDb.query.questionnaireItemDimensionScores.findFirst({
        where: and(
            eq(questionnaireItemDimensionScores.questionnaireItemId, parsed.itemId),
            eq(
                questionnaireItemDimensionScores.questionnaireDimensionId,
                parsed.dimensionId,
            ),
        ),
    });

    const now = new Date();

    if (existing && !existing.deletedAt) {
        throw new Error("Ten wymiar jest już przypisany do tego itemu.");
    }

    if (existing && existing.deletedAt) {
        const [restored] = await controlDb
            .update(questionnaireItemDimensionScores)
            .set({
                weight: String(parsed.weight),
                reverseScored: parsed.reverseScored,
                deletedAt: null,
                updatedBy: actorUserId,
                updatedAt: now,
            })
            .where(eq(questionnaireItemDimensionScores.id, existing.id))
            .returning();

        await controlDb.insert(systemAuditLog).values({
            actorUserId,
            actorRole: "SUPER_ADMIN",
            action: "questionnaire_item_dimension_score_restored",
            entityType: "questionnaire_item_dimension_score",
            entityId: restored.id,
            after: {
                questionnaireItemId: restored.questionnaireItemId,
                questionnaireDimensionId: restored.questionnaireDimensionId,
                weight: restored.weight,
                reverseScored: restored.reverseScored,
            },
        });

        return restored;
    }

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

    await controlDb.insert(systemAuditLog).values({
        actorUserId,
        actorRole: "SUPER_ADMIN",
        action: "questionnaire_item_dimension_score_created",
        entityType: "questionnaire_item_dimension_score",
        entityId: score.id,
        after: {
            questionnaireItemId: score.questionnaireItemId,
            questionnaireDimensionId: score.questionnaireDimensionId,
            weight: score.weight,
            reverseScored: score.reverseScored,
        },
    });

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

export async function archiveQuestionnaireItemAsSuperAdmin({
    actorUserId,
    input,
}: {
    actorUserId: string;
    input: ArchiveQuestionnaireItemInput;
}) {
    const parsed = archiveQuestionnaireItemSchema.parse(input);

    const existing = await controlDb.query.questionnaireItems.findFirst({
        where: and(
            eq(questionnaireItems.id, parsed.itemId),
            isNull(questionnaireItems.deletedAt),
        ),
    });

    if (!existing) {
        throw new Error("Item not found.");
    }

    const now = new Date();

    const [archived] = await controlDb
        .update(questionnaireItems)
        .set({
            deletedAt: now,
            updatedBy: actorUserId,
            updatedAt: now,
        })
        .where(eq(questionnaireItems.id, parsed.itemId))
        .returning();

    await controlDb.insert(systemAuditLog).values({
        actorUserId,
        actorRole: "SUPER_ADMIN",
        action: "questionnaire_item_archived",
        entityType: "questionnaire_item",
        entityId: archived.id,
        before: {
            code: existing.code,
            text: existing.text,
            type: existing.type,
        },
        after: {
            deletedAt: archived.deletedAt,
        },
    });

    return archived;
}
export async function archiveQuestionnairePageAsSuperAdmin({
    actorUserId,
    input,
}: {
    actorUserId: string;
    input: ArchiveQuestionnairePageInput;
}) {
    const parsed = archiveQuestionnairePageSchema.parse(input);

    const existing = await controlDb.query.questionnairePages.findFirst({
        where: and(
            eq(questionnairePages.id, parsed.pageId),
            isNull(questionnairePages.deletedAt),
        ),
    });

    if (!existing) {
        throw new Error("Questionnaire page not found.");
    }

    const now = new Date();

    const [archived] = await controlDb
        .update(questionnairePages)
        .set({
            deletedAt: now,
            updatedBy: actorUserId,
            updatedAt: now,
        })
        .where(eq(questionnairePages.id, parsed.pageId))
        .returning();

    await controlDb
        .update(questionnaireItems)
        .set({
            questionnairePageId: null,
            updatedBy: actorUserId,
            updatedAt: now,
        })
        .where(eq(questionnaireItems.questionnairePageId, parsed.pageId));

    await controlDb.insert(systemAuditLog).values({
        actorUserId,
        actorRole: "SUPER_ADMIN",
        action: "questionnaire_page_archived",
        entityType: "questionnaire_page",
        entityId: archived.id,
        before: {
            code: existing.code,
            title: existing.title,
            orderIndex: existing.orderIndex,
        },
        after: {
            deletedAt: archived.deletedAt,
            detachedItemsFromPage: true,
        },
    });

    return archived;
}

export async function archiveQuestionnaireDimensionAsSuperAdmin({
    actorUserId,
    input,
}: {
    actorUserId: string;
    input: ArchiveQuestionnaireDimensionInput;
}) {
    const parsed = archiveQuestionnaireDimensionSchema.parse(input);

    const existing = await controlDb.query.questionnaireDimensions.findFirst({
        where: and(
            eq(questionnaireDimensions.id, parsed.dimensionId),
            isNull(questionnaireDimensions.deletedAt),
        ),
    });

    if (!existing) {
        throw new Error("Questionnaire dimension not found.");
    }

    const now = new Date();

    const [archived] = await controlDb
        .update(questionnaireDimensions)
        .set({
            deletedAt: now,
            updatedBy: actorUserId,
            updatedAt: now,
        })
        .where(eq(questionnaireDimensions.id, parsed.dimensionId))
        .returning();

    await controlDb
        .update(questionnaireItemDimensionScores)
        .set({
            deletedAt: now,
            updatedBy: actorUserId,
            updatedAt: now,
        })
        .where(
            and(
                eq(
                    questionnaireItemDimensionScores.questionnaireDimensionId,
                    parsed.dimensionId,
                ),
                isNull(questionnaireItemDimensionScores.deletedAt),
            ),
        );

    await controlDb.insert(systemAuditLog).values({
        actorUserId,
        actorRole: "SUPER_ADMIN",
        action: "questionnaire_dimension_archived",
        entityType: "questionnaire_dimension",
        entityId: archived.id,
        before: {
            code: existing.code,
            name: existing.name,
            orderIndex: existing.orderIndex,
        },
        after: {
            deletedAt: archived.deletedAt,
            detachedItemScores: true,
        },
    });

    return archived;
}

export async function reorderQuestionnairePageAsSuperAdmin({
    actorUserId,
    input,
}: {
    actorUserId: string;
    input: ReorderQuestionnairePageInput;
}) {
    const parsed = reorderQuestionnairePageSchema.parse(input);

    const current = await controlDb.query.questionnairePages.findFirst({
        where: and(
            eq(questionnairePages.id, parsed.pageId),
            eq(questionnairePages.questionnaireVersionId, parsed.versionId),
            isNull(questionnairePages.deletedAt),
        ),
    });

    if (!current) {
        throw new Error("Questionnaire page not found.");
    }

    const sibling = await controlDb.query.questionnairePages.findFirst({
        where: and(
            eq(questionnairePages.questionnaireVersionId, parsed.versionId),
            isNull(questionnairePages.deletedAt),
            parsed.direction === "up"
                ? lt(questionnairePages.orderIndex, current.orderIndex)
                : gt(questionnairePages.orderIndex, current.orderIndex),
        ),
        orderBy:
            parsed.direction === "up"
                ? desc(questionnairePages.orderIndex)
                : asc(questionnairePages.orderIndex),
    });

    if (!sibling) {
        return current;
    }

    const now = new Date();

    /**
     * Żeby nie naruszyć unique index podczas zamiany miejsc,
     * chwilowo ustawiamy current na wartość techniczną -1.
     */
    await controlDb.transaction(async (tx) => {
        await tx
            .update(questionnairePages)
            .set({
                orderIndex: -1,
                updatedBy: actorUserId,
                updatedAt: now,
            })
            .where(eq(questionnairePages.id, current.id));

        await tx
            .update(questionnairePages)
            .set({
                orderIndex: current.orderIndex,
                updatedBy: actorUserId,
                updatedAt: now,
            })
            .where(eq(questionnairePages.id, sibling.id));

        await tx
            .update(questionnairePages)
            .set({
                orderIndex: sibling.orderIndex,
                updatedBy: actorUserId,
                updatedAt: now,
            })
            .where(eq(questionnairePages.id, current.id));
    });

    return current;
}

export async function reorderQuestionnaireItemAsSuperAdmin({
    actorUserId,
    input,
}: {
    actorUserId: string;
    input: ReorderQuestionnaireItemInput;
}) {
    const parsed = reorderQuestionnaireItemSchema.parse(input);

    const current = await controlDb.query.questionnaireItems.findFirst({
        where: and(
            eq(questionnaireItems.id, parsed.itemId),
            eq(questionnaireItems.questionnaireVersionId, parsed.versionId),
            isNull(questionnaireItems.deletedAt),
        ),
    });

    if (!current) {
        throw new Error("Questionnaire item not found.");
    }

    const sibling = await controlDb.query.questionnaireItems.findFirst({
        where: and(
            eq(questionnaireItems.questionnaireVersionId, parsed.versionId),
            isNull(questionnaireItems.deletedAt),
            parsed.direction === "up"
                ? lt(questionnaireItems.orderIndex, current.orderIndex)
                : gt(questionnaireItems.orderIndex, current.orderIndex),
        ),
        orderBy:
            parsed.direction === "up"
                ? desc(questionnaireItems.orderIndex)
                : asc(questionnaireItems.orderIndex),
    });

    if (!sibling) {
        return current;
    }

    const now = new Date();

    await controlDb.transaction(async (tx) => {
        await tx
            .update(questionnaireItems)
            .set({
                orderIndex: -1,
                updatedBy: actorUserId,
                updatedAt: now,
            })
            .where(eq(questionnaireItems.id, current.id));

        await tx
            .update(questionnaireItems)
            .set({
                orderIndex: current.orderIndex,
                updatedBy: actorUserId,
                updatedAt: now,
            })
            .where(eq(questionnaireItems.id, sibling.id));

        await tx
            .update(questionnaireItems)
            .set({
                orderIndex: sibling.orderIndex,
                updatedBy: actorUserId,
                updatedAt: now,
            })
            .where(eq(questionnaireItems.id, current.id));
    });

    return current;
}


function numberOrNull(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseChoiceOptionsText(value?: string | null) {
  const lines =
    value
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean) ?? [];

  return lines.map((line, index) => {
    const separatorIndex = line.indexOf("|");

    if (separatorIndex >= 0) {
      const rawValue = line.slice(0, separatorIndex).trim();
      const label = line.slice(separatorIndex + 1).trim();

      return {
        value: rawValue || `OPTION_${index + 1}`,
        label: label || rawValue || `Opcja ${index + 1}`,
      };
    }

    return {
      value: `OPTION_${index + 1}`,
      label: line,
    };
  });
}

function buildItemAnswerConfig(parsed: {
  type: string;

  scaleMin?: number | "";
  scaleMax?: number | "";
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  likertStep?: number | "";
  likertDisplay?: "buttons" | "radio" | "slider" | "";

  trueLabel?: string;
  falseLabel?: string;

  choiceOptionsText?: string;

  textMultiline?: boolean;
  textMaxLength?: number | "";

  numberMin?: number | "";
  numberMax?: number | "";
  numberStep?: number | "";
}) {
  if (parsed.type === "likert") {
    return {
      scaleMin: nullableInt(parsed.scaleMin),
      scaleMax: nullableInt(parsed.scaleMax),
      scaleMinLabel: nullIfEmpty(parsed.scaleMinLabel),
      scaleMaxLabel: nullIfEmpty(parsed.scaleMaxLabel),
      options: [],
      responseConfig: {
        display: parsed.likertDisplay || "buttons",
        step: numberOrNull(parsed.likertStep) ?? 1,
      },
    };
  }

  if (parsed.type === "true_false") {
    return {
      scaleMin: null,
      scaleMax: null,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      options: [
        {
          value: true,
          label: nullIfEmpty(parsed.trueLabel) ?? "Prawda",
        },
        {
          value: false,
          label: nullIfEmpty(parsed.falseLabel) ?? "Fałsz",
        },
      ],
      responseConfig: {},
    };
  }

  if (parsed.type === "single_choice" || parsed.type === "multiple_choice") {
    return {
      scaleMin: null,
      scaleMax: null,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      options: parseChoiceOptionsText(parsed.choiceOptionsText),
      responseConfig: {},
    };
  }

  if (parsed.type === "text") {
    return {
      scaleMin: null,
      scaleMax: null,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      options: [],
      responseConfig: {
        multiline: parsed.textMultiline !== false,
        maxLength: numberOrNull(parsed.textMaxLength) ?? 1000,
      },
    };
  }

  if (parsed.type === "number") {
    return {
      scaleMin: null,
      scaleMax: null,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      options: [],
      responseConfig: {
        min: numberOrNull(parsed.numberMin),
        max: numberOrNull(parsed.numberMax),
        step: numberOrNull(parsed.numberStep) ?? 1,
      },
    };
  }

  return {
    scaleMin: null,
    scaleMax: null,
    scaleMinLabel: null,
    scaleMaxLabel: null,
    options: [],
    responseConfig: {},
  };
}

export async function publishQuestionnaireVersionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: PublishQuestionnaireVersionInput;
}) {
  const parsed = publishQuestionnaireVersionSchema.parse(input);

  const existing = await controlDb.query.questionnaireVersions.findFirst({
    where: and(
      eq(questionnaireVersions.id, parsed.versionId),
      isNull(questionnaireVersions.deletedAt),
    ),
  });

  if (!existing) {
    throw new Error("Nie znaleziono wersji kwestionariusza.");
  }

  if (existing.status !== "draft") {
    throw new Error("Opublikować można tylko wersję roboczą.");
  }

  const validation = await validateQuestionnaireVersionForPublishing(
    parsed.versionId,
  );

  if (!validation.valid) {
    throw new Error(
      [
        "Nie można opublikować wersji kwestionariusza.",
        ...validation.issues.map((issue) => `- ${issue}`),
      ].join("\n"),
    );
  }

  const now = new Date();

  const [published] = await controlDb
    .update(questionnaireVersions)
    .set({
      status: "active",
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .where(eq(questionnaireVersions.id, parsed.versionId))
    .returning();

  await controlDb.insert(systemAuditLog).values({
    actorUserId,
    actorRole: "SUPER_ADMIN",
    action: "questionnaire_version_published",
    entityType: "questionnaire_version",
    entityId: published.id,
    before: {
      status: existing.status,
    },
    after: {
      status: published.status,
      validationPassed: true,
    },
  });

  return published;
}
export async function cloneQuestionnaireVersionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CloneQuestionnaireVersionInput;
}) {
  const parsed = cloneQuestionnaireVersionSchema.parse(input);

  const sourceVersion = await controlDb.query.questionnaireVersions.findFirst({
    where: and(
      eq(questionnaireVersions.id, parsed.sourceVersionId),
      isNull(questionnaireVersions.deletedAt),
    ),
  });

  if (!sourceVersion) {
    throw new Error("Nie znaleziono wersji źródłowej kwestionariusza.");
  }

  const existingVersionLabel =
    await controlDb.query.questionnaireVersions.findFirst({
      where: and(
        eq(questionnaireVersions.questionnaireId, sourceVersion.questionnaireId),
        eq(questionnaireVersions.version, parsed.version.trim()),
        isNull(questionnaireVersions.deletedAt),
      ),
    });

  if (existingVersionLabel) {
    throw new Error(
      `Wersja o numerze/oznaczeniu "${parsed.version.trim()}" już istnieje dla tego kwestionariusza.`,
    );
  }

  const sourceDimensions = await controlDb
    .select()
    .from(questionnaireDimensions)
    .where(
      and(
        eq(
          questionnaireDimensions.questionnaireVersionId,
          parsed.sourceVersionId,
        ),
        isNull(questionnaireDimensions.deletedAt),
      ),
    )
    .orderBy(asc(questionnaireDimensions.orderIndex));

  const sourcePages = await controlDb
    .select()
    .from(questionnairePages)
    .where(
      and(
        eq(questionnairePages.questionnaireVersionId, parsed.sourceVersionId),
        isNull(questionnairePages.deletedAt),
      ),
    )
    .orderBy(asc(questionnairePages.orderIndex));

  const sourceItems = await controlDb
    .select()
    .from(questionnaireItems)
    .where(
      and(
        eq(questionnaireItems.questionnaireVersionId, parsed.sourceVersionId),
        isNull(questionnaireItems.deletedAt),
      ),
    )
    .orderBy(asc(questionnaireItems.orderIndex));

  const sourcePageDimensionScores = await controlDb
    .select()
    .from(questionnairePageDimensionScores)
    .where(isNull(questionnairePageDimensionScores.deletedAt));

  const sourceItemDimensionScores = await controlDb
    .select()
    .from(questionnaireItemDimensionScores)
    .where(isNull(questionnaireItemDimensionScores.deletedAt));

  const sourcePageIds = new Set(sourcePages.map((page) => page.id));
  const sourceItemIds = new Set(sourceItems.map((item) => item.id));
  const sourceDimensionIds = new Set(
    sourceDimensions.map((dimension) => dimension.id),
  );

  const filteredPageDimensionScores = sourcePageDimensionScores.filter(
    (score) =>
      sourcePageIds.has(score.questionnairePageId) &&
      sourceDimensionIds.has(score.questionnaireDimensionId),
  );

  const filteredItemDimensionScores = sourceItemDimensionScores.filter(
    (score) =>
      sourceItemIds.has(score.questionnaireItemId) &&
      sourceDimensionIds.has(score.questionnaireDimensionId),
  );

  const now = new Date();

  const clonedVersion = await controlDb.transaction(async (tx) => {
    const [newVersion] = await tx
      .insert(questionnaireVersions)
      .values({
        questionnaireId: sourceVersion.questionnaireId,
        version: parsed.version.trim(),
        name: parsed.name.trim(),
        description: nullIfEmpty(parsed.description),
        status: "draft",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning();

    const dimensionIdMap = new Map<string, string>();
    const pageIdMap = new Map<string, string>();
    const itemIdMap = new Map<string, string>();

    for (const sourceDimension of sourceDimensions) {
      const [newDimension] = await tx
        .insert(questionnaireDimensions)
        .values({
          questionnaireVersionId: newVersion.id,
          code: sourceDimension.code,
          name: sourceDimension.name,
          description: sourceDimension.description,
          orderIndex: sourceDimension.orderIndex,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .returning();

      dimensionIdMap.set(sourceDimension.id, newDimension.id);
    }

    for (const sourcePage of sourcePages) {
      const [newPage] = await tx
        .insert(questionnairePages)
        .values({
          questionnaireVersionId: newVersion.id,
          code: sourcePage.code,
          title: sourcePage.title,
          description: sourcePage.description,
          orderIndex: sourcePage.orderIndex,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .returning();

      pageIdMap.set(sourcePage.id, newPage.id);
    }

    for (const sourceItem of sourceItems) {
      const newPageId = sourceItem.questionnairePageId
        ? pageIdMap.get(sourceItem.questionnairePageId) ?? null
        : null;

      const [newItem] = await tx
        .insert(questionnaireItems)
        .values({
          questionnaireVersionId: newVersion.id,
          questionnairePageId: newPageId,
          code: sourceItem.code,
          orderIndex: sourceItem.orderIndex,
          type: sourceItem.type,
          text: sourceItem.text,
          helpText: sourceItem.helpText,
          required: sourceItem.required,
          scaleMin: sourceItem.scaleMin,
          scaleMax: sourceItem.scaleMax,
          scaleMinLabel: sourceItem.scaleMinLabel,
          scaleMaxLabel: sourceItem.scaleMaxLabel,
          options: sourceItem.options,
          responseConfig: sourceItem.responseConfig,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .returning();

      itemIdMap.set(sourceItem.id, newItem.id);
    }

    for (const sourceScore of filteredPageDimensionScores) {
      const newPageId = pageIdMap.get(sourceScore.questionnairePageId);
      const newDimensionId = dimensionIdMap.get(
        sourceScore.questionnaireDimensionId,
      );

      if (!newPageId || !newDimensionId) {
        continue;
      }

      await tx.insert(questionnairePageDimensionScores).values({
        questionnairePageId: newPageId,
        questionnaireDimensionId: newDimensionId,
        weight: sourceScore.weight,
        reverseScored: sourceScore.reverseScored,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      });
    }

    for (const sourceScore of filteredItemDimensionScores) {
      const newItemId = itemIdMap.get(sourceScore.questionnaireItemId);
      const newDimensionId = dimensionIdMap.get(
        sourceScore.questionnaireDimensionId,
      );

      if (!newItemId || !newDimensionId) {
        continue;
      }

      await tx.insert(questionnaireItemDimensionScores).values({
        questionnaireItemId: newItemId,
        questionnaireDimensionId: newDimensionId,
        weight: sourceScore.weight,
        reverseScored: sourceScore.reverseScored,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      });
    }

    await tx.insert(systemAuditLog).values({
      actorUserId,
      actorRole: "SUPER_ADMIN",
      action: "questionnaire_version_cloned",
      entityType: "questionnaire_version",
      entityId: newVersion.id,
      before: {
        sourceVersionId: sourceVersion.id,
        sourceVersion: sourceVersion.version,
        sourceStatus: sourceVersion.status,
      },
      after: {
        newVersionId: newVersion.id,
        newVersion: newVersion.version,
        status: newVersion.status,
        dimensionsCount: sourceDimensions.length,
        pagesCount: sourcePages.length,
        itemsCount: sourceItems.length,
        pageDimensionScoresCount: filteredPageDimensionScores.length,
        itemDimensionScoresCount: filteredItemDimensionScores.length,
      },
    });

    return newVersion;
  });

  return clonedVersion;
}