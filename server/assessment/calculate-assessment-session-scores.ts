// server/assessment/calculate-assessment-session-scores.ts
import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireDimensions,
  questionnaireItemDimensionScores,
  questionnaireItems,
} from "@/drizzle/schema";
import {
  assessmentDimensionScores,
  assessmentResponses,
  assessmentSessions,
  assessmentProjectQuestionnaires,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";

type TenantDb = any;


type ScoringItem = {
  id: string;
  questionnaireVersionId: string;
  type: string;
  scaleMin: number | null;
  scaleMax: number | null;
  options: unknown;
};

type DimensionAggregate = {
  questionnaireId: string;
  questionnaireVersionId: string;
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  rawSum: number;
  weightedSum: number;
  weightSum: number;
  answeredItemsCount: number;
  expectedItemsCount: number;
};


type CalculateAssessmentSessionScoresInput = {
  db: TenantDb;
  sessionId: string;
};

type ResponseValue = {
  valueType: string;
  numberValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  jsonValue: unknown | null;
};

type OptionWithOptionalScore = {
  value: string | number | boolean;
  label?: string;
  score?: number | string | null;
};

function round4(value: number) {
  return Number(value.toFixed(4));
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

      const rawScore = raw.score;
      let score: number | null = null;

      if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
        score = rawScore;
      }

      if (typeof rawScore === "string" && rawScore.trim() !== "") {
        const parsed = Number(rawScore);
        score = Number.isFinite(parsed) ? parsed : null;
      }

      return {
        value: optionValue,
        label: typeof raw.label === "string" ? raw.label : undefined,
        score,
      };
    })
    .filter(Boolean) as OptionWithOptionalScore[];
}

function optionValueToString(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

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

    return typeof selected?.score === "number" ? selected.score : null;
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
          (candidate) => optionValueToString(candidate.value) === selectedValue,
        );

        return typeof option?.score === "number" ? option.score : null;
      })
      .filter((score): score is number => typeof score === "number");

    if (scores.length === 0) {
      return null;
    }

    const sum = scores.reduce((acc, score) => acc + score, 0);

    return sum / scores.length;
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

export async function calculateAssessmentSessionScores({
  db,
  sessionId,
}: CalculateAssessmentSessionScoresInput) {
  const session = await db.query.assessmentSessions.findFirst({
    where: and(
      eq(assessmentSessions.id, sessionId),
      isNull(assessmentSessions.deletedAt),
    ),
    columns: {
      id: true,
      assessmentProjectId: true,
    },
  });

  if (!session) {
    throw new Error("Nie znaleziono sesji badania do przeliczenia wyników.");
  }

  const projectQuestionnaires = await db
    .select({
      questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
    })
    .from(assessmentProjectQuestionnaires)
    .where(
      and(
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          session.assessmentProjectId,
        ),
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    );

  const questionnaireVersionIds = projectQuestionnaires.map(
    (item: any) => item.questionnaireVersionId,
  );

  if (questionnaireVersionIds.length === 0) {
    return {
      scoresCount: 0,
      message: "Projekt nie ma aktywnych kwestionariuszy.",
    };
  }

  const items = await controlDb
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

  const scoringItems: ScoringItem[] = items;
  const itemIds = scoringItems.map((item) => item.id);

  if (itemIds.length === 0) {
    return {
      scoresCount: 0,
      message: "Brak itemów do przeliczenia.",
    };
  }

  const dimensions = await controlDb
    .select({
      id: questionnaireDimensions.id,
      questionnaireVersionId: questionnaireDimensions.questionnaireVersionId,
      code: questionnaireDimensions.code,
      name: questionnaireDimensions.name,
      category: questionnaireDimensions.category,
      orderIndex: questionnaireDimensions.orderIndex,
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
    );

  const dimensionById = new Map(dimensions.map((dimension) => [dimension.id, dimension]));

  const itemDimensionScores = await controlDb
    .select({
      itemId: questionnaireItemDimensionScores.questionnaireItemId,
      dimensionId: questionnaireItemDimensionScores.questionnaireDimensionId,
      weight: questionnaireItemDimensionScores.weight,
      reverseScored: questionnaireItemDimensionScores.reverseScored,
    })
    .from(questionnaireItemDimensionScores)
    .where(
      and(
        inArray(questionnaireItemDimensionScores.questionnaireItemId, itemIds),
        isNull(questionnaireItemDimensionScores.deletedAt),
      ),
    );

  const responses = await db
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
        isNull(assessmentResponses.deletedAt),
      ),
    );



  function itemCanContributeNumericScore(item: ScoringItem) {
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
      return normalizeOptions(item.options).some(
        (option) => typeof option.score === "number",
      );
    }

    return false;
  }


  const expectedByDimension = new Map<string, number>();

  const itemById = new Map<string, ScoringItem>(
    scoringItems.map((item) => [item.id, item]),
  );

  for (const scoreConfig of itemDimensionScores) {
    const item = itemById.get(scoreConfig.itemId);

    if (!item || !itemCanContributeNumericScore(item)) {
      continue;
    }

    expectedByDimension.set(
      scoreConfig.dimensionId,
      (expectedByDimension.get(scoreConfig.dimensionId) ?? 0) + 1,
    );
  }
  const responseByItemId = new Map<string, ResponseValue>();

  for (const response of responses) {
    responseByItemId.set(response.questionnaireItemId, {
      valueType: response.valueType,
      numberValue: response.numberValue,
      textValue: response.textValue,
      booleanValue: response.booleanValue,
      jsonValue: response.jsonValue,
    });
  }



  const aggregates = new Map<string, DimensionAggregate>();

  const questionnaireIdByVersionId = new Map<string, string>();

  for (const projectQuestionnaire of projectQuestionnaires) {
    questionnaireIdByVersionId.set(
      projectQuestionnaire.questionnaireVersionId,
      projectQuestionnaire.questionnaireId,
    );
  }

  for (const scoreConfig of itemDimensionScores) {
    const item = itemById.get(scoreConfig.itemId);
    const dimension = dimensionById.get(scoreConfig.dimensionId);

    if (!item || !dimension) {
      continue;
    }

    const response = responseByItemId.get(item.id);
    let numericScore = getResponseNumericScore({ item, response });

    if (numericScore === null) {
      continue;
    }

    if (scoreConfig.reverseScored) {
      numericScore = reverseScore({ score: numericScore, item });
    }

    const weight = Number(scoreConfig.weight ?? 1);
    const safeWeight = Number.isFinite(weight) ? weight : 1;

    const questionnaireId = questionnaireIdByVersionId.get(
      item.questionnaireVersionId,
    );

    if (!questionnaireId) {
      continue;
    }


    const aggregate: DimensionAggregate =
      aggregates.get(scoreConfig.dimensionId) ?? {
        questionnaireId,
        questionnaireVersionId: item.questionnaireVersionId,
        dimensionId: scoreConfig.dimensionId,
        dimensionCode: dimension.code,
        dimensionName: dimension.name,
        rawSum: 0,
        weightedSum: 0,
        weightSum: 0,
        answeredItemsCount: 0,
        expectedItemsCount: expectedByDimension.get(scoreConfig.dimensionId) ?? 0,
      };

    aggregate.rawSum += numericScore;
    aggregate.weightedSum += numericScore * safeWeight;
    aggregate.weightSum += safeWeight;
    aggregate.answeredItemsCount += 1;

    aggregates.set(scoreConfig.dimensionId, aggregate);
  }
  const now = new Date();

  let scoresCount = 0;

  for (const aggregate of aggregates.values()) {
    if (aggregate.answeredItemsCount === 0) {
      continue;
    }

    const rawScore = round4(aggregate.rawSum);
    const weightedScore = round4(aggregate.weightedSum);
    const meanScore = round4(aggregate.rawSum / aggregate.answeredItemsCount);
    const weightedMeanScore = round4(
      aggregate.weightSum > 0
        ? aggregate.weightedSum / aggregate.weightSum
        : aggregate.weightedSum / aggregate.answeredItemsCount,
    );

    const completeness = round4(
      aggregate.expectedItemsCount > 0
        ? aggregate.answeredItemsCount / aggregate.expectedItemsCount
        : 0,
    );

    await db
      .insert(assessmentDimensionScores)
      .values({
        assessmentSessionId: sessionId,
        questionnaireId: aggregate.questionnaireId,
        questionnaireVersionId: aggregate.questionnaireVersionId,
        questionnaireDimensionId: aggregate.dimensionId,
        dimensionCode: aggregate.dimensionCode,
        dimensionName: aggregate.dimensionName,
        rawScore,
        weightedScore,
        meanScore,
        weightedMeanScore,
        normalizedScore: null,
        answeredItemsCount: aggregate.answeredItemsCount,
        expectedItemsCount: aggregate.expectedItemsCount,
        completeness,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          assessmentDimensionScores.assessmentSessionId,
          assessmentDimensionScores.questionnaireDimensionId,
        ],
        set: {
          questionnaireId: aggregate.questionnaireId,
          questionnaireVersionId: aggregate.questionnaireVersionId,
          dimensionCode: aggregate.dimensionCode,
          dimensionName: aggregate.dimensionName,
          rawScore,
          weightedScore,
          meanScore,
          weightedMeanScore,
          normalizedScore: null,
          answeredItemsCount: aggregate.answeredItemsCount,
          expectedItemsCount: aggregate.expectedItemsCount,
          completeness,
          deletedAt: null,
          updatedAt: now,
        },
      });

    scoresCount += 1;
  }

  return {
    scoresCount,
    message: `Przeliczono wyniki wymiarów: ${scoresCount}.`,
  };
}