// features/assessment-results/api/assessment-project-results.queries.ts

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { requirePermission } from "@/server/permissions/require-permission";
import { getAssessmentSessionReportHref } from "./assessment-session-report.queries";
import {
  questionnaireItems,
  questionnairePages,
  questionnaires,
  questionnaireVersions,
  questionnaireDimensions,
  questionnaireItemDimensionScores
} from "@/drizzle/schema";
import {
  assessmentDimensionScores,
  assessmentProjectQuestionnaires,
  assessmentProjects,
  assessmentResponses,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";


export type AssessmentProjectDimensionCategoryAssignment = {
  categoryCode: string;
  categoryName: string;
  valueCode: string;
  valueName: string;
};

type OptionWithOptionalScore = {
  value: string | number | boolean;
  label?: string;
  score?: number | string | null;
};

export type AssessmentProjectDimensionAggregate = {
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  sessionsCount: number;
  averageRawScore: number | null;
  averageWeightedScore: number | null;
  averageMeanScore: number | null;
  averageWeightedMeanScore: number | null;
  averageCompleteness: number | null;
  categories: AssessmentProjectDimensionCategoryAssignment[];
};
export type AssessmentProjectCrossCategoryResult = {
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;

  xCategoryCode: string;
  xCategoryName: string;
  xDimensionId: string;
  xDimensionCode: string;
  xDimensionName: string;

  yCategoryCode: string;
  yCategoryName: string;
  yDimensionId: string;
  yDimensionCode: string;
  yDimensionName: string;

  itemsCount: number;
  sessionsCount: number;
  answeredCount: number;
  expectedCount: number;

  averageRawScore: number | null;
  averageWeightedScore: number | null;
  averageMeanScore: number | null;
  averageWeightedMeanScore: number | null;
  averageCompleteness: number | null;
};

export type AssessmentProjectCategoricalAggregateOption = {
  value: string;
  label: string;
  count: number;
  percentage: number | null;
};

export type AssessmentProjectCategoricalAggregate = {
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
  itemId: string;
  itemCode: string;
  itemText: string;
  itemType: string;
  pageTitle: string | null;
  totalAnswersCount: number;
  options: AssessmentProjectCategoricalAggregateOption[];
};
export type AssessmentProjectRespondentDimensionScore = {
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  rawScore: number;
  weightedScore: number;
  meanScore: number;
  weightedMeanScore: number;
  completeness: number;
};

export type AssessmentProjectRespondentResult = {
  sessionId: string;
  sessionStatus: string;
  completedAt: Date | null;
  respondentId: string;
  respondentName: string;
  respondentEmail: string | null;
  respondentExternalCode: string | null;
  reportHref: string | null;
  scores: AssessmentProjectRespondentDimensionScore[];
};
export type AssessmentProjectResultsData = {
  tenant: {
    id: string;
    slug: string;
    name: string | null;
  };
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
  };
  summary: {
    sessionsCount: number;
    completedSessionsCount: number;
    inProgressSessionsCount: number;
    expiredSessionsCount: number;
    abandonedSessionsCount: number;
    notStartedSessionsCount: number;
  };
  dimensionAggregates: AssessmentProjectDimensionAggregate[];
  categoricalAggregates: AssessmentProjectCategoricalAggregate[];
  respondentResults: AssessmentProjectRespondentResult[];
  crossCategoryResults: AssessmentProjectCrossCategoryResult[];
};


function getRespondentDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ");

  return fullName || input.email || input.externalCode || "Respondent";
}

function round4(value: number) {
  return Number(value.toFixed(4));
}

function optionValueToString(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function normalizeOptions(value: unknown): OptionWithOptionalScore[] {
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
        label: typeof raw.label === "string" ? raw.label : undefined,
        score:
          typeof raw.score === "number" || typeof raw.score === "string"
            ? raw.score
            : null,
      };
    })
    .filter(Boolean) as OptionWithOptionalScore[];
}

function optionHasScore(option: OptionWithOptionalScore) {
  if (typeof option.score === "number" && Number.isFinite(option.score)) {
    return true;
  }

  if (typeof option.score === "string" && option.score.trim() !== "") {
    return Number.isFinite(Number(option.score));
  }

  return false;
}

function itemIsCategoricalWithoutScore(item: {
  itemType: string;
  options: unknown;
}) {
  if (
    item.itemType !== "single_choice" &&
    item.itemType !== "multiple_choice"
  ) {
    return false;
  }

  const options = normalizeOptions(item.options);

  if (options.length === 0) {
    return false;
  }

  return !options.some(optionHasScore);
}


type ResponseValue = {
  valueType: string;
  numberValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  jsonValue: unknown | null;
};

type ScoringItemForResults = {
  id: string;
  questionnaireVersionId: string;
  type: string;
  scaleMin: number | null;
  scaleMax: number | null;
  options: unknown;
};

function getResponseNumericScore({
  item,
  response,
}: {
  item: {
    type: string;
    options: unknown;
  };
  response: ResponseValue | undefined;
}) {
  if (!response) {
    return null;
  }

  if (item.type === "likert" || item.type === "number") {
    return typeof response.numberValue === "number" ? response.numberValue : null;
  }

  if (item.type === "true_false") {
    if (typeof response.booleanValue !== "boolean") {
      return null;
    }

    return response.booleanValue ? 1 : 0;
  }

  if (item.type === "single_choice") {
    if (!response.textValue) {
      return null;
    }

    const options = normalizeOptions(item.options);
    const selected = options.find(
      (option) => optionValueToString(option.value) === response.textValue,
    );

    if (typeof selected?.score === "number") {
      return selected.score;
    }

    if (typeof selected?.score === "string" && selected.score.trim() !== "") {
      const parsed = Number(selected.score);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  if (item.type === "multiple_choice") {
    if (!Array.isArray(response.jsonValue)) {
      return null;
    }

    const selectedValues = response.jsonValue.map(String);
    const options = normalizeOptions(item.options);

    const scores = selectedValues
      .map((selectedValue) => {
        const option = options.find(
          (candidate) =>
            optionValueToString(candidate.value) === selectedValue,
        );

        if (typeof option?.score === "number") {
          return option.score;
        }

        if (typeof option?.score === "string" && option.score.trim() !== "") {
          const parsed = Number(option.score);
          return Number.isFinite(parsed) ? parsed : null;
        }

        return null;
      })
      .filter((score): score is number => typeof score === "number");

    if (scores.length === 0) {
      return null;
    }

    return scores.reduce((acc, score) => acc + score, 0) / scores.length;
  }

  return null;
}

function reverseScore({
  score,
  item,
}: {
  score: number;
  item: {
    type: string;
    scaleMin: number | null;
    scaleMax: number | null;
  };
}) {
  if (item.type === "likert") {
    const min = item.scaleMin ?? 1;
    const max = item.scaleMax ?? 5;

    return max + min - score;
  }

  if (item.type === "true_false") {
    return score === 1 ? 0 : 1;
  }

  return -score;
}

function itemCanContributeNumericScore(item: ScoringItemForResults) {
  if (item.type === "likert") {
    return true;
  }

  if (item.type === "number") {
    return true;
  }

  if (item.type === "true_false") {
    return true;
  }

  if (item.type === "single_choice" || item.type === "multiple_choice") {
    return normalizeOptions(item.options).some(optionHasScore);
  }

  return false;
}


function getOptionLabel({
  options,
  value,
}: {
  options: unknown;
  value: string;
}) {
  const normalizedOptions = normalizeOptions(options);

  const option = normalizedOptions.find(
    (candidate) => optionValueToString(candidate.value) === value,
  );

  return option?.label ?? value;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return round4(values.reduce((acc, value) => acc + value, 0) / values.length);
}


function normalizeDimensionCategories(input: {
  code: string;
  name: string;
  category: string | null;
}): AssessmentProjectDimensionCategoryAssignment[] {
  const categoryCode = input.category?.trim();

  if (!categoryCode) {
    return [];
  }

  return [
    {
      categoryCode,
      categoryName: categoryCode,
      valueCode: input.code,
      valueName: input.name,
    },
  ];
}

export async function getAssessmentProjectResults({
  tenantSlug,
  assessmentProjectId,
}: {
  tenantSlug: string;
  assessmentProjectId: string;
}): Promise<AssessmentProjectResultsData | null> {
  if (!tenantSlug) {
    throw new Error("Missing tenantSlug in getAssessmentProjectResults.");
  }

  if (!assessmentProjectId) {
    throw new Error("Missing assessmentProjectId in getAssessmentProjectResults.");
  }

  const tenantContext = await requireTenantContext({ tenantSlug });
  const db = await getTenantDb(tenantContext);
  requirePermission(tenantContext, "assessment_result:read");
  const project = await db.query.assessmentProjects.findFirst({
    where: and(
      eq(assessmentProjects.id, assessmentProjectId),
      isNull(assessmentProjects.deletedAt),
    ),
  });

  if (!project) {
    return null;
  }

  const sessions = await db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      sessionCompletedAt: assessmentSessions.completedAt,

      respondentId: respondents.id,
      respondentExternalCode: respondents.externalCode,
      respondentEmail: respondentIdentities.email,
      respondentFirstName: respondentIdentities.firstName,
      respondentLastName: respondentIdentities.lastName,
    })
    .from(assessmentSessions)
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
        eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
        isNull(assessmentSessions.deletedAt),
        isNull(respondents.deletedAt),
      ),
    );

  const sessionIds = sessions.map((session) => session.sessionId);

  const completedSessionIds = sessions
    .filter((session) => session.sessionStatus === "completed")
    .map((session) => session.sessionId);

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
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          assessmentProjectId,
        ),
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    )
    .orderBy(asc(assessmentProjectQuestionnaires.orderIndex));


  const questionnaireVersionIds = projectQuestionnaires.map(
    (item) => item.questionnaireVersionId,
  );

  const dimensionDefinitionRows =
    questionnaireVersionIds.length > 0
      ? await controlDb
        .select({
          id: questionnaireDimensions.id,
          questionnaireVersionId:
            questionnaireDimensions.questionnaireVersionId,
          code: questionnaireDimensions.code,
          name: questionnaireDimensions.name,
          category: questionnaireDimensions.category,
        })
        .from(questionnaireDimensions)
        .where(
          and(
            inArray(
              questionnaireDimensions.questionnaireVersionId,
              questionnaireVersionIds,
            ),
            isNull(questionnaireDimensions.deletedAt),
          ),
        )
      : [];

  const categoriesByDimensionId = new Map<
    string,
    AssessmentProjectDimensionCategoryAssignment[]
  >();

  const categoriesByDimensionKey = new Map<
    string,
    AssessmentProjectDimensionCategoryAssignment[]
  >();

  for (const row of dimensionDefinitionRows) {
    const categories = normalizeDimensionCategories({
      code: row.code,
      name: row.name,
      category: row.category,
    });

    categoriesByDimensionId.set(row.id, categories);

    categoriesByDimensionKey.set(
      `${row.questionnaireVersionId}:${row.code}`,
      categories,
    );
  }
const dimensionDefinitionById = new Map(
  dimensionDefinitionRows.map((row) => [row.id, row]),
);

  let dimensionAggregates: AssessmentProjectDimensionAggregate[] = [];
  let categoricalAggregates: AssessmentProjectCategoricalAggregate[] = [];
let crossCategoryResults: AssessmentProjectCrossCategoryResult[] = [];

  let scoreRows: {
    questionnaireId: string;
    questionnaireVersionId: string;
    questionnaireDimensionId: string;
    dimensionCode: string;
    dimensionName: string;
    rawScore: number;
    weightedScore: number;
    meanScore: number;
    weightedMeanScore: number;
    completeness: number;
    assessmentSessionId: string;
  }[] = [];

  let versionMetaRows: {
    questionnaireId: string;
    questionnaireName: string;
    questionnaireVersionId: string;
    questionnaireVersionName: string;
  }[] = [];

  if (completedSessionIds.length > 0) {
    scoreRows = await db
      .select({
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
        completeness: assessmentDimensionScores.completeness,
        assessmentSessionId: assessmentDimensionScores.assessmentSessionId,
      })
      .from(assessmentDimensionScores)
      .where(
        and(
          inArray(
            assessmentDimensionScores.assessmentSessionId,
            completedSessionIds,
          ),
          isNull(assessmentDimensionScores.deletedAt),
        ),
      );
  }

  if (questionnaireVersionIds.length > 0) {
    versionMetaRows = await controlDb
      .select({
        questionnaireId: questionnaires.id,
        questionnaireName: questionnaires.name,
        questionnaireVersionId: questionnaireVersions.id,
        questionnaireVersionName: questionnaireVersions.name,
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
  }

  const versionMetaById = new Map(
    versionMetaRows.map((row) => [row.questionnaireVersionId, row]),
  );
if (questionnaireVersionIds.length > 0 && completedSessionIds.length > 0) {
  const scoringItems = await controlDb
    .select({
      id: questionnaireItems.id,
      questionnaireVersionId: questionnaireItems.questionnaireVersionId,
      type: questionnaireItems.type,
      scaleMin: questionnaireItems.scaleMin,
      scaleMax: questionnaireItems.scaleMax,
      options: questionnaireItems.options,
    })
    .from(questionnaireItems)
    .where(
      and(
        inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
        isNull(questionnaireItems.deletedAt),
      ),
    );

  const numericScoringItems: ScoringItemForResults[] = scoringItems.filter(
    itemCanContributeNumericScore,
  );

  const scoringItemIds = numericScoringItems.map((item) => item.id);

  const itemById = new Map(
    numericScoringItems.map((item) => [item.id, item]),
  );

  const itemDimensionScoreRows =
    scoringItemIds.length > 0
      ? await controlDb
          .select({
            itemId: questionnaireItemDimensionScores.questionnaireItemId,
            dimensionId:
              questionnaireItemDimensionScores.questionnaireDimensionId,
            weight: questionnaireItemDimensionScores.weight,
            reverseScored: questionnaireItemDimensionScores.reverseScored,
          })
          .from(questionnaireItemDimensionScores)
          .where(
            and(
              inArray(
                questionnaireItemDimensionScores.questionnaireItemId,
                scoringItemIds,
              ),
              isNull(questionnaireItemDimensionScores.deletedAt),
            ),
          )
      : [];

  const itemDimensionScoresByItemId = new Map<
    string,
    {
      itemId: string;
      dimensionId: string;
      weight: string | number;
      reverseScored: boolean;
    }[]
  >();

  for (const row of itemDimensionScoreRows) {
    const existing = itemDimensionScoresByItemId.get(row.itemId) ?? [];
    existing.push(row);
    itemDimensionScoresByItemId.set(row.itemId, existing);
  }

  type CrossPairDefinition = {
    itemId: string;
    questionnaireVersionId: string;

    xDimensionId: string;
    xDimensionCode: string;
    xDimensionName: string;
    xCategoryCode: string;
    xCategoryName: string;
    xWeight: number;
    xReverseScored: boolean;

    yDimensionId: string;
    yDimensionCode: string;
    yDimensionName: string;
    yCategoryCode: string;
    yCategoryName: string;
    yWeight: number;
    yReverseScored: boolean;
  };

  const crossPairDefinitions: CrossPairDefinition[] = [];

  for (const item of numericScoringItems) {
    const scoreConfigs = itemDimensionScoresByItemId.get(item.id) ?? [];

    for (const xConfig of scoreConfigs) {
      const xDimension = dimensionDefinitionById.get(xConfig.dimensionId);
      const xCategoryCode = xDimension?.category?.trim();

      if (!xDimension || !xCategoryCode) {
        continue;
      }

      for (const yConfig of scoreConfigs) {
        if (xConfig.dimensionId === yConfig.dimensionId) {
          continue;
        }

        const yDimension = dimensionDefinitionById.get(yConfig.dimensionId);
        const yCategoryCode = yDimension?.category?.trim();

        if (!yDimension || !yCategoryCode) {
          continue;
        }

        if (xCategoryCode === yCategoryCode) {
          continue;
        }

        const xWeight = Number(xConfig.weight ?? 1);
        const yWeight = Number(yConfig.weight ?? 1);

        crossPairDefinitions.push({
          itemId: item.id,
          questionnaireVersionId: item.questionnaireVersionId,

          xDimensionId: xDimension.id,
          xDimensionCode: xDimension.code,
          xDimensionName: xDimension.name,
          xCategoryCode,
          xCategoryName: xCategoryCode,
          xWeight: Number.isFinite(xWeight) ? xWeight : 1,
          xReverseScored: xConfig.reverseScored,

          yDimensionId: yDimension.id,
          yDimensionCode: yDimension.code,
          yDimensionName: yDimension.name,
          yCategoryCode,
          yCategoryName: yCategoryCode,
          yWeight: Number.isFinite(yWeight) ? yWeight : 1,
          yReverseScored: yConfig.reverseScored,
        });
      }
    }
  }

  const crossItemIds = Array.from(
    new Set(crossPairDefinitions.map((pair) => pair.itemId)),
  );

  const crossResponseRows =
    crossItemIds.length > 0
      ? await db
          .select({
            assessmentSessionId: assessmentResponses.assessmentSessionId,
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
              inArray(assessmentResponses.assessmentSessionId, completedSessionIds),
              inArray(assessmentResponses.questionnaireItemId, crossItemIds),
              isNull(assessmentResponses.deletedAt),
            ),
          )
      : [];

  const responseBySessionAndItemId = new Map<string, ResponseValue>();

  for (const response of crossResponseRows) {
    responseBySessionAndItemId.set(
      `${response.assessmentSessionId}:${response.questionnaireItemId}`,
      {
        valueType: response.valueType,
        numberValue: response.numberValue,
        textValue: response.textValue,
        booleanValue: response.booleanValue,
        jsonValue: response.jsonValue,
      },
    );
  }

  type CrossAggregateBuilder = {
    questionnaireId: string;
    questionnaireVersionId: string;
    questionnaireName: string;
    questionnaireVersionName: string;

    xCategoryCode: string;
    xCategoryName: string;
    xDimensionId: string;
    xDimensionCode: string;
    xDimensionName: string;

    yCategoryCode: string;
    yCategoryName: string;
    yDimensionId: string;
    yDimensionCode: string;
    yDimensionName: string;

    itemIds: Set<string>;
    sessionIds: Set<string>;

    rawValues: number[];
    weightedValues: number[];
    weightedNumerator: number;
    weightedDenominator: number;

    answeredCount: number;
    expectedCount: number;
  };

  const crossAggregateMap = new Map<string, CrossAggregateBuilder>();

  for (const pair of crossPairDefinitions) {
    const versionMeta = versionMetaById.get(pair.questionnaireVersionId);

    if (!versionMeta) {
      continue;
    }

    const key = [
      pair.questionnaireVersionId,
      pair.xCategoryCode,
      pair.xDimensionId,
      pair.yCategoryCode,
      pair.yDimensionId,
    ].join("::");

    const aggregate =
      crossAggregateMap.get(key) ??
      {
        questionnaireId: versionMeta.questionnaireId,
        questionnaireVersionId: pair.questionnaireVersionId,
        questionnaireName: versionMeta.questionnaireName,
        questionnaireVersionName: versionMeta.questionnaireVersionName,

        xCategoryCode: pair.xCategoryCode,
        xCategoryName: pair.xCategoryName,
        xDimensionId: pair.xDimensionId,
        xDimensionCode: pair.xDimensionCode,
        xDimensionName: pair.xDimensionName,

        yCategoryCode: pair.yCategoryCode,
        yCategoryName: pair.yCategoryName,
        yDimensionId: pair.yDimensionId,
        yDimensionCode: pair.yDimensionCode,
        yDimensionName: pair.yDimensionName,

        itemIds: new Set<string>(),
        sessionIds: new Set<string>(),

        rawValues: [],
        weightedValues: [],
        weightedNumerator: 0,
        weightedDenominator: 0,

        answeredCount: 0,
        expectedCount: 0,
      };

    aggregate.itemIds.add(pair.itemId);
    aggregate.expectedCount += completedSessionIds.length;

    const item = itemById.get(pair.itemId);

    if (!item) {
      continue;
    }

    for (const sessionId of completedSessionIds) {
      const response = responseBySessionAndItemId.get(
        `${sessionId}:${pair.itemId}`,
      );

      let xScore = getResponseNumericScore({
        item,
        response,
      });

      let yScore = getResponseNumericScore({
        item,
        response,
      });

      if (xScore === null || yScore === null) {
        continue;
      }

      if (pair.xReverseScored) {
        xScore = reverseScore({
          score: xScore,
          item,
        });
      }

      if (pair.yReverseScored) {
        yScore = reverseScore({
          score: yScore,
          item,
        });
      }

      const rawPairValue = (xScore + yScore) / 2;
      const weightedNumerator =
        xScore * pair.xWeight + yScore * pair.yWeight;
      const weightedDenominator = pair.xWeight + pair.yWeight;

      if (weightedDenominator <= 0) {
        continue;
      }

      const weightedPairValue = weightedNumerator / weightedDenominator;

      aggregate.rawValues.push(rawPairValue);
      aggregate.weightedValues.push(weightedPairValue);
      aggregate.weightedNumerator += weightedNumerator;
      aggregate.weightedDenominator += weightedDenominator;
      aggregate.answeredCount += 1;
      aggregate.sessionIds.add(sessionId);
    }

    crossAggregateMap.set(key, aggregate);
  }

  crossCategoryResults = Array.from(crossAggregateMap.values())
    .map((aggregate) => ({
      questionnaireId: aggregate.questionnaireId,
      questionnaireVersionId: aggregate.questionnaireVersionId,
      questionnaireName: aggregate.questionnaireName,
      questionnaireVersionName: aggregate.questionnaireVersionName,

      xCategoryCode: aggregate.xCategoryCode,
      xCategoryName: aggregate.xCategoryName,
      xDimensionId: aggregate.xDimensionId,
      xDimensionCode: aggregate.xDimensionCode,
      xDimensionName: aggregate.xDimensionName,

      yCategoryCode: aggregate.yCategoryCode,
      yCategoryName: aggregate.yCategoryName,
      yDimensionId: aggregate.yDimensionId,
      yDimensionCode: aggregate.yDimensionCode,
      yDimensionName: aggregate.yDimensionName,

      itemsCount: aggregate.itemIds.size,
      sessionsCount: aggregate.sessionIds.size,
      answeredCount: aggregate.answeredCount,
      expectedCount: aggregate.expectedCount,

      averageRawScore: average(aggregate.rawValues),
      averageWeightedScore: average(aggregate.weightedValues),
      averageMeanScore: average(aggregate.rawValues),
      averageWeightedMeanScore:
        aggregate.weightedDenominator > 0
          ? round4(aggregate.weightedNumerator / aggregate.weightedDenominator)
          : null,
      averageCompleteness:
        aggregate.expectedCount > 0
          ? round4(aggregate.answeredCount / aggregate.expectedCount)
          : null,
    }))
    .sort((a, b) => {
      const questionnaireCompare = a.questionnaireName.localeCompare(
        b.questionnaireName,
        "pl",
      );

      if (questionnaireCompare !== 0) {
        return questionnaireCompare;
      }

      const xCompare = a.xDimensionName.localeCompare(b.xDimensionName, "pl");

      if (xCompare !== 0) {
        return xCompare;
      }

      return a.yDimensionName.localeCompare(b.yDimensionName, "pl");
    });
}
  if (completedSessionIds.length > 0) {

    const dimensionMap = new Map<
      string,
      {
        questionnaireId: string;
        questionnaireVersionId: string;
        questionnaireName: string;
        questionnaireVersionName: string;
        dimensionId: string;
        dimensionCode: string;
        dimensionName: string;
        sessionIds: Set<string>;
        rawScores: number[];
        weightedScores: number[];
        meanScores: number[];
        weightedMeanScores: number[];
        completenessValues: number[];
      }
    >();

    for (const score of scoreRows) {
      const key = `${score.questionnaireVersionId}:${score.questionnaireDimensionId}`;
      const versionMeta = versionMetaById.get(score.questionnaireVersionId);

      const aggregate =
        dimensionMap.get(key) ??
        {
          questionnaireId: score.questionnaireId,
          questionnaireVersionId: score.questionnaireVersionId,
          questionnaireName: versionMeta?.questionnaireName ?? "—",
          questionnaireVersionName: versionMeta?.questionnaireVersionName ?? "—",
          dimensionId: score.questionnaireDimensionId,
          dimensionCode: score.dimensionCode,
          dimensionName: score.dimensionName,
          sessionIds: new Set<string>(),
          rawScores: [],
          weightedScores: [],
          meanScores: [],
          weightedMeanScores: [],
          completenessValues: [],
        };

      aggregate.sessionIds.add(score.assessmentSessionId);
      aggregate.rawScores.push(Number(score.rawScore));
      aggregate.weightedScores.push(Number(score.weightedScore));
      aggregate.meanScores.push(Number(score.meanScore));
      aggregate.weightedMeanScores.push(Number(score.weightedMeanScore));
      aggregate.completenessValues.push(Number(score.completeness));

      dimensionMap.set(key, aggregate);
    }

    dimensionAggregates = Array.from(dimensionMap.values())
      .map((aggregate) => ({
        questionnaireId: aggregate.questionnaireId,
        questionnaireVersionId: aggregate.questionnaireVersionId,
        questionnaireName: aggregate.questionnaireName,
        questionnaireVersionName: aggregate.questionnaireVersionName,
        dimensionId: aggregate.dimensionId,
        dimensionCode: aggregate.dimensionCode,
        dimensionName: aggregate.dimensionName,
        sessionsCount: aggregate.sessionIds.size,
        averageRawScore: average(aggregate.rawScores),
        averageWeightedScore: average(aggregate.weightedScores),
        averageMeanScore: average(aggregate.meanScores),
        averageWeightedMeanScore: average(aggregate.weightedMeanScores),
        averageCompleteness: average(aggregate.completenessValues),
        categories:
          categoriesByDimensionId.get(aggregate.dimensionId) ??
          categoriesByDimensionKey.get(
            `${aggregate.questionnaireVersionId}:${aggregate.dimensionCode}`,
          ) ??
          [],
      }))
      .sort((a, b) => {
        const questionnaireCompare = a.questionnaireName.localeCompare(
          b.questionnaireName,
          "pl",
        );

        if (questionnaireCompare !== 0) {
          return questionnaireCompare;
        }

        return a.dimensionCode.localeCompare(b.dimensionCode, "pl");
      });
  }

  if (questionnaireVersionIds.length > 0 && completedSessionIds.length > 0) {
    const itemRows = await controlDb
      .select({
        itemId: questionnaireItems.id,
        itemCode: questionnaireItems.code,
        itemText: questionnaireItems.text,
        itemType: questionnaireItems.type,
        options: questionnaireItems.options,
        orderIndex: questionnaireItems.orderIndex,

        questionnaireId: questionnaires.id,
        questionnaireName: questionnaires.name,
        questionnaireVersionId: questionnaireVersions.id,
        questionnaireVersionName: questionnaireVersions.name,

        pageTitle: questionnairePages.title,
        pageOrderIndex: questionnairePages.orderIndex,
      })
      .from(questionnaireItems)
      .innerJoin(
        questionnaireVersions,
        eq(questionnaireVersions.id, questionnaireItems.questionnaireVersionId),
      )
      .innerJoin(
        questionnaires,
        eq(questionnaires.id, questionnaireVersions.questionnaireId),
      )
      .leftJoin(
        questionnairePages,
        and(
          eq(questionnairePages.id, questionnaireItems.questionnairePageId),
          eq(
            questionnairePages.questionnaireVersionId,
            questionnaireItems.questionnaireVersionId,
          ),
          isNull(questionnairePages.deletedAt),
        ),
      )
      .where(
        and(
          inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
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
      );

    const categoricalItems = itemRows.filter(itemIsCategoricalWithoutScore);
    const categoricalItemIds = categoricalItems.map((item) => item.itemId);

    if (categoricalItemIds.length > 0) {
      const responseRows = await db
        .select({
          questionnaireItemId: assessmentResponses.questionnaireItemId,
          textValue: assessmentResponses.textValue,
          jsonValue: assessmentResponses.jsonValue,
        })
        .from(assessmentResponses)
        .where(
          and(
            inArray(assessmentResponses.assessmentSessionId, completedSessionIds),
            inArray(assessmentResponses.questionnaireItemId, categoricalItemIds),
            isNull(assessmentResponses.deletedAt),
          ),
        );

      const responsesByItemId = new Map<
        string,
        {
          textValue: string | null;
          jsonValue: unknown | null;
        }[]
      >();

      for (const response of responseRows) {
        const existing = responsesByItemId.get(response.questionnaireItemId) ?? [];
        existing.push({
          textValue: response.textValue,
          jsonValue: response.jsonValue,
        });
        responsesByItemId.set(response.questionnaireItemId, existing);
      }

      categoricalAggregates = categoricalItems.map((item) => {
        const counts = new Map<string, number>();
        const responses = responsesByItemId.get(item.itemId) ?? [];

        for (const response of responses) {
          if (item.itemType === "single_choice" && response.textValue) {
            counts.set(
              response.textValue,
              (counts.get(response.textValue) ?? 0) + 1,
            );
          }

          if (
            item.itemType === "multiple_choice" &&
            Array.isArray(response.jsonValue)
          ) {
            for (const value of response.jsonValue) {
              const key = String(value);
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
          }
        }

        const totalAnswersCount = Array.from(counts.values()).reduce(
          (acc, count) => acc + count,
          0,
        );

        const normalizedOptions = normalizeOptions(item.options);

        return {
          questionnaireId: item.questionnaireId,
          questionnaireVersionId: item.questionnaireVersionId,
          questionnaireName: item.questionnaireName,
          questionnaireVersionName: item.questionnaireVersionName,
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemText: item.itemText,
          itemType: item.itemType,
          pageTitle: item.pageTitle,
          totalAnswersCount,
          options: normalizedOptions
            .map((option) => {
              const value = optionValueToString(option.value);
              const count = counts.get(value) ?? 0;

              return {
                value,
                label: option.label ?? value,
                count,
                percentage:
                  totalAnswersCount > 0
                    ? round4(count / totalAnswersCount)
                    : null,
              };
            })
            .sort((a, b) => b.count - a.count),
        };
      });
    }
  }


  const scoresBySessionId = new Map<
    string,
    AssessmentProjectRespondentDimensionScore[]
  >();

  for (const score of scoreRows) {
    const versionMeta = versionMetaById.get(score.questionnaireVersionId);

    const existing = scoresBySessionId.get(score.assessmentSessionId) ?? [];

    existing.push({
      questionnaireId: score.questionnaireId,
      questionnaireVersionId: score.questionnaireVersionId,
      questionnaireName: versionMeta?.questionnaireName ?? "—",
      questionnaireVersionName: versionMeta?.questionnaireVersionName ?? "—",
      dimensionId: score.questionnaireDimensionId,
      dimensionCode: score.dimensionCode,
      dimensionName: score.dimensionName,
      rawScore: Number(score.rawScore),
      weightedScore: Number(score.weightedScore),
      meanScore: Number(score.meanScore),
      weightedMeanScore: Number(score.weightedMeanScore),
      completeness: Number(score.completeness),
    });

    scoresBySessionId.set(score.assessmentSessionId, existing);
  }

  const respondentResults: AssessmentProjectRespondentResult[] = await Promise.all(
    sessions.map(async (session) => {
      const reportHref =
        session.sessionStatus === "completed"
          ? await getAssessmentSessionReportHref({
            tenantSlug,
            sessionId: session.sessionId,
          })
          : null;

      return {
        sessionId: session.sessionId,
        sessionStatus: session.sessionStatus,
        completedAt: session.sessionCompletedAt,
        respondentId: session.respondentId,
        respondentName: getRespondentDisplayName({
          firstName: session.respondentFirstName,
          lastName: session.respondentLastName,
          email: session.respondentEmail,
          externalCode: session.respondentExternalCode,
        }),
        respondentEmail: session.respondentEmail,
        respondentExternalCode: session.respondentExternalCode,
        reportHref,
        scores: (scoresBySessionId.get(session.sessionId) ?? []).sort((a, b) => {
          const questionnaireCompare = a.questionnaireName.localeCompare(
            b.questionnaireName,
            "pl",
          );

          if (questionnaireCompare !== 0) {
            return questionnaireCompare;
          }

          return a.dimensionCode.localeCompare(b.dimensionCode, "pl");
        }),
      };
    }),
  );

  return {
    tenant: {
      id: tenantContext.tenantId,
      slug: tenantContext.tenantSlug,
      name:
        "tenantName" in tenantContext
          ? String(tenantContext.tenantName ?? "")
          : null,
    },
    crossCategoryResults,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
    },
    summary: {
      sessionsCount: sessions.length,
      completedSessionsCount: sessions.filter(
        (session) => session.sessionStatus === "completed",
      ).length,
      inProgressSessionsCount: sessions.filter(
        (session) => session.sessionStatus === "in_progress",
      ).length,
      expiredSessionsCount: sessions.filter(
        (session) => session.sessionStatus === "expired",
      ).length,
      abandonedSessionsCount: sessions.filter(
        (session) => session.sessionStatus === "abandoned",
      ).length,
      notStartedSessionsCount: sessions.filter(
        (session) => session.sessionStatus === "not_started",
      ).length,
    },
    dimensionAggregates,
    categoricalAggregates,
    respondentResults
  };
}