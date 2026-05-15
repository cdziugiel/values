// features/public-assessment/api/assessment-result-snapshot.mutations.ts

"use server";

import { and, asc, eq, isNull } from "drizzle-orm";

import {
  questionnaireItemDimensionScores,
  questionnaireItems,
  questionnairePages,
  questionnaires,
  questionnaireVersions,
} from "@/drizzle/schema";

import {
  assessmentDimensionScores,
  assessmentProjectQuestionnaires,
  assessmentProjects,
  assessmentResponses,
  assessmentResultSnapshots,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";

type TenantDb = any;

type ResponseValue = {
  valueType: string;
  numberValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  jsonValue: unknown | null;
};
import { inArray } from "drizzle-orm";
import { questionnaireDimensions } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

function normalizeDimensionCategory(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || "Pozostałe";
}

function getDimensionCategoryOrderIndex(category: string | null | undefined) {
  const normalized = normalizeDimensionCategory(category).toLowerCase();

  const order: Record<string, number> = {
    "wartości": 10,
    "style adaptacyjne": 20,
    "zmiana": 30,
    "potencjał zmiany": 40,
    "warunki zmiany": 50,
    "pozostałe": 999,
  };

  return order[normalized] ?? 500;
}

async function enrichScoresWithDimensionMetadata(scores: any[]) {
  const dimensionIds = Array.from(
    new Set(
      scores
        .map((score) => score.questionnaireDimensionId ?? score.dimensionId)
        .filter(Boolean),
    ),
  );

  if (dimensionIds.length === 0) {
    return scores;
  }

  const dimensions = await controlDb
    .select({
      id: questionnaireDimensions.id,
      code: questionnaireDimensions.code,
      name: questionnaireDimensions.name,
      category: questionnaireDimensions.category,
      orderIndex: questionnaireDimensions.orderIndex,
    })
    .from(questionnaireDimensions)
    .where(inArray(questionnaireDimensions.id, dimensionIds));

  const dimensionById = new Map(
    dimensions.map((dimension) => [dimension.id, dimension]),
  );

  return scores
    .map((score) => {
      const dimensionId = score.questionnaireDimensionId ?? score.dimensionId;
      const dimension = dimensionById.get(dimensionId);

      const dimensionCategory = normalizeDimensionCategory(
        dimension?.category,
      );

      return {
        ...score,

        dimensionId,
        questionnaireDimensionId: dimensionId,

        dimensionCode: dimension?.code ?? score.dimensionCode ?? "—",
        dimensionName: dimension?.name ?? score.dimensionName ?? "—",

        dimensionCategory,
        dimensionCategoryLabel: dimensionCategory,
        dimensionCategoryOrderIndex:
          getDimensionCategoryOrderIndex(dimensionCategory),

        dimensionOrderIndex:
          typeof dimension?.orderIndex === "number"
            ? dimension.orderIndex
            : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => {
      const categoryDiff =
        a.dimensionCategoryOrderIndex - b.dimensionCategoryOrderIndex;

      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return a.dimensionOrderIndex - b.dimensionOrderIndex;
    });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getLikertValueLabel({
  responseConfig,
  value,
}: {
  responseConfig: unknown;
  value: number | null;
}) {
  if (value === null || value === undefined) {
    return null;
  }

  const config = asRecord(responseConfig);
  const valueLabels = asRecord(config.valueLabels);
  const label = valueLabels[String(value)];

  return typeof label === "string" && label.trim() ? label.trim() : null;
}

function normalizeOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((option) => {
      if (typeof option !== "object" || option === null) {
        return null;
      }

      const raw = option as Record<string, unknown>;
      const optionValue = raw.value;

      if (
        typeof optionValue !== "string" &&
        typeof optionValue !== "number" &&
        typeof optionValue !== "boolean"
      ) {
        return null;
      }

      return {
        value: optionValue,
        label: typeof raw.label === "string" ? raw.label : String(optionValue),
      };
    })
    .filter(Boolean) as {
    value: string | number | boolean;
    label: string;
  }[];
}

function optionValueToString(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function getOptionLabel({
  options,
  value,
}: {
  options: unknown;
  value: string;
}) {
  const option = normalizeOptions(options).find(
    (candidate) => optionValueToString(candidate.value) === value,
  );

  return option?.label ?? value;
}

function getResponseDisplayValue({
  item,
  response,
}: {
  item: {
    type: string;
    options: unknown;
    responseConfig: unknown;
  };
  response: ResponseValue | undefined;
}) {
  if (!response) {
    return "—";
  }

  if (item.type === "likert") {
    const numberValue =
      typeof response.numberValue === "number" ? response.numberValue : null;

    const label = getLikertValueLabel({
      responseConfig: item.responseConfig,
      value: numberValue,
    });

    return label ?? (numberValue === null ? "—" : String(numberValue));
  }

  if (item.type === "number") {
    return response.numberValue === null ? "—" : String(response.numberValue);
  }

  if (item.type === "true_false") {
    if (typeof response.booleanValue !== "boolean") {
      return "—";
    }

    return response.booleanValue ? "Prawda" : "Fałsz";
  }

  if (item.type === "single_choice") {
    if (!response.textValue) {
      return "—";
    }

    return getOptionLabel({
      options: item.options,
      value: response.textValue,
    });
  }

  if (item.type === "multiple_choice") {
    if (!Array.isArray(response.jsonValue)) {
      return "—";
    }

    return response.jsonValue
      .map((value) =>
        getOptionLabel({
          options: item.options,
          value: String(value),
        }),
      )
      .join(", ");
  }

  if (item.type === "text") {
    return response.textValue || "—";
  }

  return "—";
}

function getDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ");

  return name || input.email || input.externalCode || "Respondent";
}

export async function createAssessmentResultSnapshot({
  db,
  tenantSlug,
  sessionId,
  actorUserId = null,
}: {
  db: TenantDb;
  tenantSlug: string;
  sessionId: string;
  actorUserId?: string | null;
}) {
  const existingSnapshot =
    await db.query.assessmentResultSnapshots.findFirst({
      where: and(
        eq(assessmentResultSnapshots.assessmentSessionId, sessionId),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    });

  if (existingSnapshot) {
    return existingSnapshot;
  }

  const sessionRows = await db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      sessionStartedAt: assessmentSessions.startedAt,
      sessionCompletedAt: assessmentSessions.completedAt,

      projectId: assessmentProjects.id,
      projectName: assessmentProjects.name,
      projectDescription: assessmentProjects.description,

      respondentId: respondents.id,
      respondentExternalCode: respondents.externalCode,

      respondentEmail: respondentIdentities.email,
      respondentFirstName: respondentIdentities.firstName,
      respondentLastName: respondentIdentities.lastName,
    })
    .from(assessmentSessions)
    .innerJoin(
      assessmentProjects,
      eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
    )
    .innerJoin(respondents, eq(respondents.id, assessmentSessions.respondentId))
    .leftJoin(
      respondentIdentities,
      and(
        eq(respondentIdentities.respondentId, respondents.id),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .where(
      and(
        eq(assessmentSessions.id, sessionId),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(respondents.deletedAt),
      ),
    )
    .limit(1);

  const session = sessionRows[0];

  if (!session) {
    throw new Error("Nie znaleziono sesji do utworzenia snapshotu wyniku.");
  }

  const projectQuestionnaires = await db
    .select({
      questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
      orderIndex: assessmentProjectQuestionnaires.orderIndex,
    })
    .from(assessmentProjectQuestionnaires)
    .where(
      and(
        eq(assessmentProjectQuestionnaires.assessmentProjectId, session.projectId),
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    )
    .orderBy(asc(assessmentProjectQuestionnaires.orderIndex));

  const questionnaireVersionIds = projectQuestionnaires.map(
    (row: any) => row.questionnaireVersionId,
  );

  const scores = await db
    .select({
      id: assessmentDimensionScores.id,
      questionnaireId: assessmentDimensionScores.questionnaireId,
      questionnaireVersionId: assessmentDimensionScores.questionnaireVersionId,
      questionnaireDimensionId:
        assessmentDimensionScores.questionnaireDimensionId,
      dimensionCode: assessmentDimensionScores.dimensionCode,
      dimensionName: assessmentDimensionScores.dimensionName,
      rawScore: assessmentDimensionScores.rawScore,
      weightedScore: assessmentDimensionScores.weightedScore,
      meanScore: assessmentDimensionScores.meanScore,
      weightedMeanScore: assessmentDimensionScores.weightedMeanScore,
      normalizedScore: assessmentDimensionScores.normalizedScore,
      answeredItemsCount: assessmentDimensionScores.answeredItemsCount,
      expectedItemsCount: assessmentDimensionScores.expectedItemsCount,
      completeness: assessmentDimensionScores.completeness,
    })
    .from(assessmentDimensionScores)
    .where(
      and(
        eq(assessmentDimensionScores.assessmentSessionId, sessionId),
        isNull(assessmentDimensionScores.deletedAt),
      ),
    )
    .orderBy(asc(assessmentDimensionScores.dimensionCode));

    const enrichedScores = await enrichScoresWithDimensionMetadata(scores);

  const itemRows =
    questionnaireVersionIds.length > 0
      ? await db.transaction(async () => {
          return await import("@/server/db/control-db").then(
            async ({ controlDb }) =>
              controlDb
                .select({
                  itemId: questionnaireItems.id,
                  itemCode: questionnaireItems.code,
                  itemText: questionnaireItems.text,
                  itemType: questionnaireItems.type,
                  required: questionnaireItems.required,
                  orderIndex: questionnaireItems.orderIndex,
                  scaleMin: questionnaireItems.scaleMin,
                  scaleMax: questionnaireItems.scaleMax,
                  scaleMinLabel: questionnaireItems.scaleMinLabel,
                  scaleMaxLabel: questionnaireItems.scaleMaxLabel,
                  options: questionnaireItems.options,
                  responseConfig: questionnaireItems.responseConfig,

                  questionnaireId: questionnaires.id,
                  questionnaireName: questionnaires.name,
                  questionnaireVersionId: questionnaireVersions.id,
                  questionnaireVersionName: questionnaireVersions.name,

                  pageId: questionnairePages.id,
                  pageTitle: questionnairePages.title,
                  pageOrderIndex: questionnairePages.orderIndex,
                })
                .from(questionnaireItems)
                .innerJoin(
                  questionnaireVersions,
                  eq(
                    questionnaireVersions.id,
                    questionnaireItems.questionnaireVersionId,
                  ),
                )
                .innerJoin(
                  questionnaires,
                  eq(questionnaires.id, questionnaireVersions.questionnaireId),
                )
                .leftJoin(
                  questionnairePages,
                  and(
                    eq(questionnairePages.id, questionnaireItems.questionnairePageId),
                    isNull(questionnairePages.deletedAt),
                  ),
                )
                .where(
                  and(
                    inArray(
                      questionnaireItems.questionnaireVersionId,
                      questionnaireVersionIds,
                    ),
                    isNull(questionnaireItems.deletedAt),
                    isNull(questionnaireVersions.deletedAt),
                    isNull(questionnaires.deletedAt),
                  ),
                )
                .orderBy(
                  asc(questionnaires.name),
                  asc(questionnaireVersions.name),
                  asc(questionnairePages.orderIndex),
                  asc(questionnaireItems.orderIndex),
                ),
          );
        })
      : [];

  const itemIds = itemRows.map((item: any) => item.itemId);

  const responseRows =
    itemIds.length > 0
      ? await db
          .select({
            questionnaireItemId: assessmentResponses.questionnaireItemId,
            valueType: assessmentResponses.valueType,
            numberValue: assessmentResponses.numberValue,
            textValue: assessmentResponses.textValue,
            booleanValue: assessmentResponses.booleanValue,
            jsonValue: assessmentResponses.jsonValue,
          })
          .from(assessmentResponses)
          .where(
            and(
              eq(assessmentResponses.assessmentSessionId, sessionId),
              inArray(assessmentResponses.questionnaireItemId, itemIds),
              isNull(assessmentResponses.deletedAt),
            ),
          )
      : [];

  const responseByItemId = new Map<string, ResponseValue>();

  for (const response of responseRows) {
    responseByItemId.set(response.questionnaireItemId, {
      valueType: response.valueType,
      numberValue: response.numberValue,
      textValue: response.textValue,
      booleanValue: response.booleanValue,
      jsonValue: response.jsonValue,
    });
  }

  const dimensionRows =
    itemIds.length > 0
      ? await import("@/server/db/control-db").then(async ({ controlDb }) =>
          controlDb
            .select({
              scoreConfigId: questionnaireItemDimensionScores.id,
              itemId: questionnaireItemDimensionScores.questionnaireItemId,
              dimensionId:
                questionnaireItemDimensionScores.questionnaireDimensionId,
              weight: questionnaireItemDimensionScores.weight,
              reverseScored: questionnaireItemDimensionScores.reverseScored,
              dimensionCode: questionnaireDimensions.code,
              dimensionName: questionnaireDimensions.name,
            })
            .from(questionnaireItemDimensionScores)
            .innerJoin(
              questionnaireDimensions,
              eq(
                questionnaireDimensions.id,
                questionnaireItemDimensionScores.questionnaireDimensionId,
              ),
            )
            .where(
              and(
                inArray(questionnaireItemDimensionScores.questionnaireItemId, itemIds),
                isNull(questionnaireItemDimensionScores.deletedAt),
                isNull(questionnaireDimensions.deletedAt),
              ),
            ),
        )
      : [];

  const dimensionsByItemId = new Map<string, typeof dimensionRows>();

  for (const dimension of dimensionRows) {
    const existing = dimensionsByItemId.get(dimension.itemId) ?? [];
    existing.push(dimension);
    dimensionsByItemId.set(dimension.itemId, existing);
  }

  const responses = itemRows.map((item: any) => {
    const response = responseByItemId.get(item.itemId);

    return {
      itemId: item.itemId,
      itemCode: item.itemCode,
      itemText: item.itemText,
      itemType: item.itemType,
      required: item.required,
      orderIndex: item.orderIndex,

      questionnaireId: item.questionnaireId,
      questionnaireName: item.questionnaireName,
      questionnaireVersionId: item.questionnaireVersionId,
      questionnaireVersionName: item.questionnaireVersionName,

      pageId: item.pageId,
      pageTitle: item.pageTitle,
      pageOrderIndex: item.pageOrderIndex,

      responseExists: Boolean(response),
      responseValueType: response?.valueType ?? null,
      responseDisplayValue: getResponseDisplayValue({
        item: {
          type: item.itemType,
          options: item.options,
          responseConfig: item.responseConfig,
        },
        response,
      }),

      dimensions: dimensionsByItemId.get(item.itemId) ?? [],
    };
  });

  const payload = {
    frozenAt: new Date().toISOString(),
    tenant: {
      slug: tenantSlug,
    },
    session: {
      id: session.sessionId,
      status: session.sessionStatus,
      startedAt: session.sessionStartedAt,
      completedAt: session.sessionCompletedAt,
    },
    project: {
      id: session.projectId,
      name: session.projectName,
      description: session.projectDescription,
    },
    respondent: {
      id: session.respondentId,
      email: session.respondentEmail,
      externalCode: session.respondentExternalCode,
      displayName: getDisplayName({
        firstName: session.respondentFirstName,
        lastName: session.respondentLastName,
        email: session.respondentEmail,
        externalCode: session.respondentExternalCode,
      }),
    },
    scores: enrichedScores,
    responses,
  };

  const [created] = await db
    .insert(assessmentResultSnapshots)
    .values({
      assessmentSessionId: sessionId,
      tenantSlug,
      payload,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  return created;
}