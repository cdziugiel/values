import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireDimensions,
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
} from "@/drizzle/schema/tenant-schema";

import { controlDb } from "@/server/db/control-db";

type TenantDb = any;

type CreateAssessmentResultSnapshotInput = {
  db: TenantDb;
  tenantSlug: string;
  sessionId: string;
  actorUserId: string | null;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
};

type ResponseValueRow = {
  questionnaireItemId: string;
  valueType: string;
  numberValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  jsonValue: unknown | null;
};

type OptionConfig = {
  value: string | number | boolean;
  label?: string | null;
  score?: number | string | null;
};

function normalizeOptions(value: unknown): OptionConfig[] {
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
        label: typeof raw.label === "string" ? raw.label : null,
        score:
          typeof raw.score === "number" || typeof raw.score === "string"
            ? raw.score
            : null,
      };
    })
    .filter(Boolean) as OptionConfig[];
}

function optionValueToString(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function normalizeResponseConfig(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getValueLabels(responseConfig: unknown) {
  const config = normalizeResponseConfig(responseConfig);
  const valueLabels = config.valueLabels;

  if (
    typeof valueLabels === "object" &&
    valueLabels !== null &&
    !Array.isArray(valueLabels)
  ) {
    return valueLabels as Record<string, unknown>;
  }

  return {};
}

function getLikertLabel({
  responseConfig,
  value,
}: {
  responseConfig: unknown;
  value: number;
}) {
  const labels = getValueLabels(responseConfig);
  const label = labels[String(value)];

  return typeof label === "string" && label.trim() ? label.trim() : null;
}

function getResponseExists(response: ResponseValueRow | undefined) {
  if (!response) {
    return false;
  }

  if (response.valueType === "number") {
    return response.numberValue !== null && response.numberValue !== undefined;
  }

  if (response.valueType === "text") {
    return typeof response.textValue === "string" && response.textValue.trim() !== "";
  }

  if (response.valueType === "boolean") {
    return typeof response.booleanValue === "boolean";
  }

  if (response.valueType === "json") {
    return Array.isArray(response.jsonValue) && response.jsonValue.length > 0;
  }

  return false;
}

function getResponseRawValue(response: ResponseValueRow | undefined) {
  if (!response) {
    return null;
  }

  if (response.valueType === "number") {
    return response.numberValue;
  }

  if (response.valueType === "text") {
    return response.textValue;
  }

  if (response.valueType === "boolean") {
    return response.booleanValue;
  }

  if (response.valueType === "json") {
    return response.jsonValue;
  }

  return null;
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
  response: ResponseValueRow | undefined;
}) {
  if (!response || !getResponseExists(response)) {
    return "—";
  }

  if (item.type === "likert") {
    if (typeof response.numberValue !== "number") {
      return "—";
    }

    return (
      getLikertLabel({
        responseConfig: item.responseConfig,
        value: response.numberValue,
      }) ?? String(response.numberValue)
    );
  }

  if (item.type === "number") {
    return response.numberValue !== null && response.numberValue !== undefined
      ? String(response.numberValue)
      : "—";
  }

  if (item.type === "text") {
    return response.textValue?.trim() || "—";
  }

  if (item.type === "true_false") {
    if (typeof response.booleanValue !== "boolean") {
      return "—";
    }

    const options = normalizeOptions(item.options);
    const selected = options.find(
      (option) => option.value === response.booleanValue,
    );

    return selected?.label || (response.booleanValue ? "Prawda" : "Fałsz");
  }

  if (item.type === "single_choice") {
    if (!response.textValue) {
      return "—";
    }

    const options = normalizeOptions(item.options);
    const selected = options.find(
      (option) => optionValueToString(option.value) === response.textValue,
    );

    return selected?.label || response.textValue;
  }

  if (item.type === "multiple_choice") {
    if (!Array.isArray(response.jsonValue)) {
      return "—";
    }

    const selectedValues = response.jsonValue.map(String);
    const options = normalizeOptions(item.options);

    const labels = selectedValues.map((selectedValue) => {
      const option = options.find(
        (candidate) => optionValueToString(candidate.value) === selectedValue,
      );

      return option?.label || selectedValue;
    });

    return labels.length > 0 ? labels.join(", ") : "—";
  }

  return "—";
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function categoryKey(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized || "__NO_CATEGORY__";
}

function categoryLabel(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized || "Bez kategorii";
}

function buildAnalytics({
  responses,
}: {
  responses: {
    itemId: string;
    responseExists: boolean;
    numericValue: number | null;
    dimensions: {
      dimensionCode: string;
      dimensionCategory: string;
    }[];
  }[];
}) {
  const dimensionCodesByCategory: Record<string, string[]> = {};
  const responsesByDimensionCategory: Record<
    string,
    Record<string, string[]>
  > = {};

  for (const response of responses) {
    for (const dimension of response.dimensions) {
      const category = categoryKey(dimension.dimensionCategory);
      const code = dimension.dimensionCode;

      dimensionCodesByCategory[category] ??= [];
      responsesByDimensionCategory[category] ??= {};
      responsesByDimensionCategory[category][code] ??= [];

      if (!dimensionCodesByCategory[category].includes(code)) {
        dimensionCodesByCategory[category].push(code);
      }

      if (!responsesByDimensionCategory[category][code].includes(response.itemId)) {
        responsesByDimensionCategory[category][code].push(response.itemId);
      }
    }
  }

  for (const codes of Object.values(dimensionCodesByCategory)) {
    codes.sort((a, b) =>
      a.localeCompare(b, "pl", {
        sensitivity: "base",
        numeric: true,
      }),
    );
  }

  return {
    dimensionCodesByCategory,
    responsesByDimensionCategory,
  };
}


function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export async function createAssessmentResultSnapshot({
  db,
  tenantSlug,
  sessionId,
  actorUserId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: CreateAssessmentResultSnapshotInput) {
  const session = await db.query.assessmentSessions.findFirst({
    where: and(
      eq(assessmentSessions.id, sessionId),
      isNull(assessmentSessions.deletedAt),
    ),
    columns: {
      id: true,
      assessmentProjectId: true,
      respondentId: true,
      status: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!session) {
    throw new Error("Nie znaleziono sesji badania do utworzenia snapshotu.");
  }

  const project = await db.query.assessmentProjects.findFirst({
    where: and(
      eq(assessmentProjects.id, session.assessmentProjectId),
      isNull(assessmentProjects.deletedAt),
    ),
    columns: {
      id: true,
      name: true,
      description: true,
    },
  });


 const projectQuestionnaireConditions = [
  eq(
    assessmentProjectQuestionnaires.assessmentProjectId,
    session.assessmentProjectId,
  ),
  eq(assessmentProjectQuestionnaires.status, "active"),
  isNull(assessmentProjectQuestionnaires.deletedAt),
];

if (projectQuestionnaireId) {
  projectQuestionnaireConditions.push(
    eq(assessmentProjectQuestionnaires.id, projectQuestionnaireId),
  );
}

if (questionnaireVersionId) {
  projectQuestionnaireConditions.push(
    eq(
      assessmentProjectQuestionnaires.questionnaireVersionId,
      questionnaireVersionId,
    ),
  );
}

const projectQuestionnaireRows = await db
  .select({
    questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
    questionnaireVersionId:
      assessmentProjectQuestionnaires.questionnaireVersionId,
  })
  .from(assessmentProjectQuestionnaires)
  .where(and(...projectQuestionnaireConditions));

const questionnaireVersionIds = uniqueNonEmpty(
  projectQuestionnaireRows.map((row: any) => row.questionnaireVersionId),
);

if (questionnaireVersionIds.length === 0) {
  throw new Error("Nie znaleziono aktywnego kwestionariusza do snapshotu.");
}

if (questionnaireVersionIds.length > 1) {
  throw new Error(
    "Snapshot został zablokowany, bo wskazano więcej niż jedną wersję kwestionariusza.",
  );
}

  const questionnaireRows = await controlDb
    .select({
      questionnaireId: questionnaires.id,
      questionnaireCode: questionnaires.code,
      questionnaireName: questionnaires.name,
      questionnaireDescription: questionnaires.description,

      questionnaireVersionId: questionnaireVersions.id,
      questionnaireVersionName: questionnaireVersions.name,
      questionnaireVersion: questionnaireVersions.version,
    })
    .from(questionnaireVersions)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, questionnaireVersions.questionnaireId),
    )
    .where(
      and(
        inArray(questionnaireVersions.id, questionnaireVersionIds),
        isNull(questionnaireVersions.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    );

  const questionnaireByVersionId = new Map(
    questionnaireRows.map((row) => [row.questionnaireVersionId, row]),
  );

  const itemRows = await controlDb
    .select({
      itemId: questionnaireItems.id,
      questionnaireId: questionnaireVersions.questionnaireId,
      questionnaireVersionId: questionnaireItems.questionnaireVersionId,
      itemCode: questionnaireItems.code,
      itemType: questionnaireItems.type,
      itemText: questionnaireItems.text,
      itemHelpText: questionnaireItems.helpText,
      itemRequired: questionnaireItems.required,
      itemOrderIndex: questionnaireItems.orderIndex,
      scaleMin: questionnaireItems.scaleMin,
      scaleMax: questionnaireItems.scaleMax,
      scaleMinLabel: questionnaireItems.scaleMinLabel,
      scaleMaxLabel: questionnaireItems.scaleMaxLabel,
      options: questionnaireItems.options,
      responseConfig: questionnaireItems.responseConfig,

      pageId: questionnairePages.id,
      pageCode: questionnairePages.code,
      pageTitle: questionnairePages.title,
      pageDescription: questionnairePages.description,
      pageOrderIndex: questionnairePages.orderIndex,
    })
    .from(questionnaireItems)
    .innerJoin(
      questionnaireVersions,
      eq(questionnaireVersions.id, questionnaireItems.questionnaireVersionId),
    )
    .leftJoin(
      questionnairePages,
      eq(questionnairePages.id, questionnaireItems.questionnairePageId),
    )
    .where(
      and(
        inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
        isNull(questionnaireItems.deletedAt),
        isNull(questionnaireVersions.deletedAt),
      ),
    )
    .orderBy(
      asc(questionnairePages.orderIndex),
      asc(questionnaireItems.orderIndex),
    );

  const itemIds = itemRows.map((item) => item.itemId);

  const responseRows = itemIds.length
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

  const responseByItemId = new Map<string, ResponseValueRow>(
    responseRows.map((response: any) => [response.questionnaireItemId, response]),
  );

  const itemDimensionRows = itemIds.length
    ? await controlDb
      .select({
        itemId: questionnaireItemDimensionScores.questionnaireItemId,
        dimensionId: questionnaireDimensions.id,
        dimensionCode: questionnaireDimensions.code,
        dimensionName: questionnaireDimensions.name,
        dimensionDescription: questionnaireDimensions.description,
        dimensionCategory: questionnaireDimensions.category,
        dimensionOrderIndex: questionnaireDimensions.orderIndex,
        weight: questionnaireItemDimensionScores.weight,
        reverseScored: questionnaireItemDimensionScores.reverseScored,
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
      )
      .orderBy(
        asc(questionnaireDimensions.category),
        asc(questionnaireDimensions.orderIndex),
      )
    : [];

  const dimensionsByItemId = new Map<string, typeof itemDimensionRows>();

  for (const row of itemDimensionRows) {
    const existing = dimensionsByItemId.get(row.itemId) ?? [];
    existing.push(row);
    dimensionsByItemId.set(row.itemId, existing);
  }

  const allDimensions = Array.from(
    new Map(
      itemDimensionRows.map((dimension) => [
        dimension.dimensionId,
        {
          dimensionId: dimension.dimensionId,
          dimensionCode: dimension.dimensionCode,
          dimensionName: dimension.dimensionName,
          dimensionDescription: dimension.dimensionDescription,
          dimensionCategory: categoryKey(dimension.dimensionCategory),
          dimensionCategoryLabel: categoryLabel(dimension.dimensionCategory),
          dimensionCategoryOrderIndex: 0,
          dimensionOrderIndex: dimension.dimensionOrderIndex,
        },
      ]),
    ).values(),
  ).sort((a, b) => {
    const categoryDiff = a.dimensionCategory.localeCompare(
      b.dimensionCategory,
      "pl",
      {
        sensitivity: "base",
        numeric: true,
      },
    );

    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return a.dimensionOrderIndex - b.dimensionOrderIndex;
  });

  const dimensionCategories = Array.from(
    new Map(
      allDimensions.map((dimension) => [
        dimension.dimensionCategory,
        {
          key: dimension.dimensionCategory,
          label: dimension.dimensionCategoryLabel,
          orderIndex: dimension.dimensionCategoryOrderIndex,
        },
      ]),
    ).values(),
  ).sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    return a.label.localeCompare(b.label, "pl", {
      sensitivity: "base",
      numeric: true,
    });
  });

  const scoresRows = await db
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
    );

  const dimensionMetaById = new Map(
    allDimensions.map((dimension) => [dimension.dimensionId, dimension]),
  );

  const scores = scoresRows.map((score: any) => {
    const dimension = dimensionMetaById.get(score.questionnaireDimensionId);

    return {
      id: score.id,
      questionnaireId: score.questionnaireId,
      questionnaireVersionId: score.questionnaireVersionId,

      dimensionId: score.questionnaireDimensionId,
      dimensionCode: score.dimensionCode,
      dimensionName: score.dimensionName,

      dimensionCategory: dimension?.dimensionCategory ?? "__NO_CATEGORY__",
      dimensionCategoryLabel: dimension?.dimensionCategoryLabel ?? "Bez kategorii",
      dimensionCategoryOrderIndex:
        dimension?.dimensionCategoryOrderIndex ?? Number.MAX_SAFE_INTEGER,
      dimensionOrderIndex:
        dimension?.dimensionOrderIndex ?? Number.MAX_SAFE_INTEGER,

      rawScore: score.rawScore,
      weightedScore: score.weightedScore,
      meanScore: score.meanScore,
      weightedMeanScore: score.weightedMeanScore,
      normalizedScore: score.normalizedScore,
      answeredItemsCount: score.answeredItemsCount,
      expectedItemsCount: score.expectedItemsCount,
      completeness: score.completeness,
    };
  });

  const responses = itemRows.map((item) => {
    const response = responseByItemId.get(item.itemId);
    const itemDimensions = dimensionsByItemId.get(item.itemId) ?? [];

    const numericValue =
      typeof response?.numberValue === "number" ? response.numberValue : null;

    const questionnaire = questionnaireByVersionId.get(
      item.questionnaireVersionId,
    );

    return {
      itemId: item.itemId,
      itemCode: item.itemCode,
      itemType: item.itemType,
      itemText: item.itemText,
      itemHelpText: item.itemHelpText,
      itemRequired: item.itemRequired,
      itemOrderIndex: item.itemOrderIndex,

      questionnaireId: item.questionnaireId,
      questionnaireVersionId: item.questionnaireVersionId,
      questionnaireName: questionnaire?.questionnaireName ?? null,
      questionnaireVersionName: questionnaire?.questionnaireVersionName ?? null,

      pageId: item.pageId,
      pageCode: item.pageCode,
      pageTitle: item.pageTitle,
      pageDescription: item.pageDescription,
      pageOrderIndex: item.pageOrderIndex,

      scaleMin: item.scaleMin,
      scaleMax: item.scaleMax,
      scaleMinLabel: item.scaleMinLabel,
      scaleMaxLabel: item.scaleMaxLabel,

      responseExists: getResponseExists(response),
      responseValueType: response?.valueType ?? null,
      responseRawValue: getResponseRawValue(response),
      responseNumericValue: numericValue,
      responseDisplayValue: getResponseDisplayValue({
        item: {
          type: item.itemType,
          options: item.options,
          responseConfig: item.responseConfig,
        },
        response,
      }),

      dimensions: itemDimensions.map((dimension) => ({
        dimensionId: dimension.dimensionId,
        dimensionCode: dimension.dimensionCode,
        dimensionName: dimension.dimensionName,
        dimensionDescription: dimension.dimensionDescription,

        dimensionCategory: categoryKey(dimension.dimensionCategory),
        dimensionCategoryLabel: categoryLabel(dimension.dimensionCategory),
        dimensionCategoryOrderIndex: 0,
        dimensionOrderIndex: dimension.dimensionOrderIndex,

        weight: numberOrNull(dimension.weight) ?? 1,
        reverseScored: dimension.reverseScored,
      })),
    };
  });

  const payload = {
    version: 2,
    tenantSlug,
    frozenAt: new Date().toISOString(),

    session: {
      id: session.id,
      status: session.status,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },

    project: {
      id: project?.id ?? session.assessmentProjectId,
      name: project?.name ?? null,
      description: project?.description ?? null,
    },

    questionnaires: questionnaireRows.map((questionnaire) => ({
      questionnaireId: questionnaire.questionnaireId,
      questionnaireCode: questionnaire.questionnaireCode,
      questionnaireName: questionnaire.questionnaireName,
      questionnaireDescription: questionnaire.questionnaireDescription,
      questionnaireVersionId: questionnaire.questionnaireVersionId,
      questionnaireVersionName: questionnaire.questionnaireVersionName,
      questionnaireVersion: questionnaire.questionnaireVersion,
    })),

    dimensionCategories,
    dimensions: allDimensions,
    scores,
    responses,

    analytics: buildAnalytics({
      responses: responses.map((response) => ({
        itemId: response.itemId,
        responseExists: response.responseExists,
        numericValue: response.responseNumericValue,
        dimensions: response.dimensions.map((dimension) => ({
          dimensionCode: dimension.dimensionCode,
          dimensionCategory: dimension.dimensionCategory,
        })),
      })),
    }),
  };

  const now = new Date();

  const [snapshot] = await db
    .insert(assessmentResultSnapshots)
    .values({
      assessmentSessionId: sessionId,
      tenantSlug,
      payload,
      createdBy: actorUserId,
      updatedBy: actorUserId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: assessmentResultSnapshots.assessmentSessionId,
      set: {
        tenantSlug,
        payload,
        deletedAt: null,
        updatedBy: actorUserId,
        updatedAt: now,
      },
    })
    .returning();

  return snapshot;
}