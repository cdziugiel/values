// features/report-builder/lib/report-snapshot-helpers.ts

import type {
  ReportDataApi,
  ReportDimension,
  ReportDimensionCategory,
  ReportIntersectionScore,
  ReportResponse,
  ReportScore,
  ReportScoreSortMode,
  ReportSnapshotPayload,
} from "../types/report-builder.types";

const FALLBACK_ORDER_INDEX = Number.MAX_SAFE_INTEGER;

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown): number | null {
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

function numberOrFallback(value: unknown, fallback = FALLBACK_ORDER_INDEX) {
  const parsed = numberOrNull(value);
  return parsed ?? fallback;
}

function compareText(left: unknown, right: unknown) {
  return String(left ?? "").localeCompare(String(right ?? ""), "pl", {
    sensitivity: "base",
    numeric: true,
  });
}

function compareByDimensionOrder(left: {
  dimensionOrderIndex?: unknown;
  dimensionCode?: unknown;
  dimensionName?: unknown;
}, right: {
  dimensionOrderIndex?: unknown;
  dimensionCode?: unknown;
  dimensionName?: unknown;
}) {
  const orderDiff =
    numberOrFallback(left.dimensionOrderIndex) -
    numberOrFallback(right.dimensionOrderIndex);

  if (orderDiff !== 0) {
    return orderDiff;
  }

  const codeDiff = compareText(left.dimensionCode, right.dimensionCode);

  if (codeDiff !== 0) {
    return codeDiff;
  }

  return compareText(left.dimensionName, right.dimensionName);
}

function getMetricValue(
  score: ReportScore,
  metric: "weightedMeanScore" | "meanScore" | "normalizedScore" | "rawScore",
) {
  return numberOrNull(score[metric]);
}

function getScorePreferredValue(
  score: ReportScore | null,
  prefer: "weightedMeanScore" | "meanScore" | "normalizedScore" | "rawScore",
) {
  if (!score) {
    return null;
  }

  const preferred = numberOrNull(score[prefer]);

  if (preferred !== null) {
    return preferred;
  }

  return (
    numberOrNull(score.weightedMeanScore) ??
    numberOrNull(score.meanScore) ??
    numberOrNull(score.normalizedScore) ??
    numberOrNull(score.rawScore)
  );
}

function scoreHasDimension(score: ReportScore, category: string, code: string) {
  return (
    normalizeKey(score.dimensionCategory) === normalizeKey(category) &&
    normalizeKey(score.dimensionCode) === normalizeKey(code)
  );
}

function dimensionMatches(
  dimension: {
    dimensionCategory?: unknown;
    dimensionCode?: unknown;
  },
  category: string,
  code: string,
) {
  return (
    normalizeKey(dimension.dimensionCategory) === normalizeKey(category) &&
    normalizeKey(dimension.dimensionCode) === normalizeKey(code)
  );
}

function responseHasDimension(
  response: ReportResponse,
  category: string,
  code: string,
) {
  return response.dimensions.some((dimension) =>
    dimensionMatches(dimension, category, code),
  );
}

function responseHasCategory(response: ReportResponse, category: string) {
  return response.dimensions.some(
    (dimension) => normalizeKey(dimension.dimensionCategory) === normalizeKey(category),
  );
}

function getResponseDimension(
  response: ReportResponse,
  category: string,
  code: string,
) {
  return (
    response.dimensions.find((dimension) =>
      dimensionMatches(dimension, category, code),
    ) ?? null
  );
}

function getResponseNumericValue(response: ReportResponse) {
  return numberOrNull(response.responseNumericValue);
}

function sortScores(scores: ReportScore[], sort: ReportScoreSortMode = "order") {
  return [...scores].sort((left, right) => {
    if (sort === "mean_desc") {
      return (
        (numberOrNull(right.meanScore) ?? -Infinity) -
        (numberOrNull(left.meanScore) ?? -Infinity)
      );
    }

    if (sort === "mean_asc") {
      return (
        (numberOrNull(left.meanScore) ?? Infinity) -
        (numberOrNull(right.meanScore) ?? Infinity)
      );
    }

    if (sort === "weighted_mean_desc") {
      return (
        (numberOrNull(right.weightedMeanScore) ?? -Infinity) -
        (numberOrNull(left.weightedMeanScore) ?? -Infinity)
      );
    }

    if (sort === "weighted_mean_asc") {
      return (
        (numberOrNull(left.weightedMeanScore) ?? Infinity) -
        (numberOrNull(right.weightedMeanScore) ?? Infinity)
      );
    }

    if (sort === "code") {
      return compareText(left.dimensionCode, right.dimensionCode);
    }

    if (sort === "name") {
      return compareText(left.dimensionName, right.dimensionName);
    }

    return compareByDimensionOrder(left, right);
  });
}

function sortDimensions(dimensions: ReportDimension[]) {
  return [...dimensions].sort((left, right) => {
    const categoryOrderDiff =
      numberOrFallback(left.dimensionCategoryOrderIndex) -
      numberOrFallback(right.dimensionCategoryOrderIndex);

    if (categoryOrderDiff !== 0) {
      return categoryOrderDiff;
    }

    const categoryDiff = compareText(
      left.dimensionCategoryLabel ?? left.dimensionCategory,
      right.dimensionCategoryLabel ?? right.dimensionCategory,
    );

    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return compareByDimensionOrder(left, right);
  });
}

function filterAnsweredResponses(
  responses: ReportResponse[],
  onlyAnswered = true,
) {
  if (!onlyAnswered) {
    return responses;
  }

  return responses.filter((response) => response.responseExists);
}

function calculateIntersectionScore({
  filterCategory,
  filterCode,
  targetCategory,
  targetCode,
  responses,
}: {
  filterCategory: string;
  filterCode: string;
  targetCategory: string;
  targetCode: string;
  responses: ReportResponse[];
}): ReportIntersectionScore {
  const matchingResponses = responses.filter(
    (response) =>
      response.responseExists &&
      responseHasDimension(response, filterCategory, filterCode) &&
      responseHasDimension(response, targetCategory, targetCode),
  );

  let rawSum = 0;
  let weightedSum = 0;
  let weightSum = 0;
  let answeredItemsCount = 0;

  for (const response of matchingResponses) {
    const numericValue = getResponseNumericValue(response);

    if (numericValue === null) {
      continue;
    }

    const targetDimension = getResponseDimension(
      response,
      targetCategory,
      targetCode,
    );

    const weight = numberOrNull(targetDimension?.weight) ?? 1;

    rawSum += numericValue;
    weightedSum += numericValue * weight;
    weightSum += weight;
    answeredItemsCount += 1;
  }

  const expectedItemsCount = responses.filter(
    (response) =>
      responseHasDimension(response, filterCategory, filterCode) &&
      responseHasDimension(response, targetCategory, targetCode),
  ).length;

  return {
    filter: {
      category: filterCategory,
      code: filterCode,
    },
    target: {
      category: targetCategory,
      code: targetCode,
    },

    rawSum,
    weightedSum,
    weightSum,

    meanScore:
      answeredItemsCount > 0 ? Number((rawSum / answeredItemsCount).toFixed(4)) : null,

    weightedMeanScore:
      answeredItemsCount > 0
        ? Number(
            (
              weightSum > 0
                ? weightedSum / weightSum
                : weightedSum / answeredItemsCount
            ).toFixed(4),
          )
        : null,

    answeredItemsCount,
    expectedItemsCount,
    completeness:
      expectedItemsCount > 0
        ? Number((answeredItemsCount / expectedItemsCount).toFixed(4))
        : 0,

    responses: matchingResponses,
  };
}

function getUniqueTargetCodesFromIntersection({
  filterCategory,
  filterCode,
  targetCategory,
  responses,
}: {
  filterCategory: string;
  filterCode: string;
  targetCategory: string;
  responses: ReportResponse[];
}) {
  const codes = new Set<string>();

  for (const response of responses) {
    if (!responseHasDimension(response, filterCategory, filterCode)) {
      continue;
    }

    for (const dimension of response.dimensions) {
      if (normalizeKey(dimension.dimensionCategory) === normalizeKey(targetCategory)) {
        codes.add(dimension.dimensionCode);
      }
    }
  }

  return Array.from(codes).sort((left, right) =>
    left.localeCompare(right, "pl", {
      sensitivity: "base",
      numeric: true,
    }),
  );
}

export function buildReportDataApi(
  payloadInput: ReportSnapshotPayload | null | undefined,
): ReportDataApi {
  const payload: ReportSnapshotPayload = payloadInput ?? {};

  const scores: ReportScore[] = Array.isArray(payload.scores)
    ? payload.scores
    : [];

  const responses: ReportResponse[] = Array.isArray(payload.responses)
    ? payload.responses
    : [];

  const dimensions: ReportDimension[] = Array.isArray(payload.dimensions)
    ? sortDimensions(payload.dimensions)
    : [];

  const dimensionCategories: ReportDimensionCategory[] = Array.isArray(
    payload.dimensionCategories,
  )
    ? [...payload.dimensionCategories].sort((left, right) => {
        const orderDiff =
          numberOrFallback(left.orderIndex) - numberOrFallback(right.orderIndex);

        if (orderDiff !== 0) {
          return orderDiff;
        }

        return compareText(left.label, right.label);
      })
    : [];

  function scoreRow(category: string, code: string) {
    return scores.find((score) => scoreHasDimension(score, category, code)) ?? null;
  }

  function score(
    category: string,
    code: string,
    options?: {
      prefer?: "weightedMeanScore" | "meanScore" | "normalizedScore" | "rawScore";
    },
  ) {
    return getScorePreferredValue(
      scoreRow(category, code),
      options?.prefer ?? "weightedMeanScore",
    );
  }

  function scoresByCategory(
    category: string,
    options?: {
      sort?: ReportScoreSortMode;
    },
  ) {
    return sortScores(
      scores.filter(
        (score) => normalizeKey(score.dimensionCategory) === normalizeKey(category),
      ),
      options?.sort ?? "order",
    );
  }

  function dimension(category: string, code: string) {
    return (
      dimensions.find((candidate) => dimensionMatches(candidate, category, code)) ??
      null
    );
  }

  function dimensionsByCategory(category: string) {
    return dimensions.filter(
      (dimension) =>
        normalizeKey(dimension.dimensionCategory) === normalizeKey(category),
    );
  }

  function responsesByDimension(
    category: string,
    code: string,
    options?: {
      onlyAnswered?: boolean;
    },
  ) {
    const matching = responses.filter((response) =>
      responseHasDimension(response, category, code),
    );

    return filterAnsweredResponses(matching, options?.onlyAnswered ?? true);
  }

  function responsesByIntersection(
    filterCategory: string,
    filterCode: string,
    targetCategory: string,
    targetCode?: string,
    options?: {
      onlyAnswered?: boolean;
    },
  ) {
    const matching = responses.filter((response) => {
      const hasFilterDimension = responseHasDimension(
        response,
        filterCategory,
        filterCode,
      );

      if (!hasFilterDimension) {
        return false;
      }

      if (targetCode) {
        return responseHasDimension(response, targetCategory, targetCode);
      }

      return responseHasCategory(response, targetCategory);
    });

    return filterAnsweredResponses(matching, options?.onlyAnswered ?? true);
  }

  function scoreByIntersection(
    filterCategory: string,
    filterCode: string,
    targetCategory: string,
    targetCode: string,
  ) {
    return calculateIntersectionScore({
      filterCategory,
      filterCode,
      targetCategory,
      targetCode,
      responses,
    });
  }

  function scoresByIntersection(
    filterCategory: string,
    filterCode: string,
    targetCategory: string,
  ) {
    const targetCodes = getUniqueTargetCodesFromIntersection({
      filterCategory,
      filterCode,
      targetCategory,
      responses,
    });

    return targetCodes
      .map((targetCode) =>
        scoreByIntersection(filterCategory, filterCode, targetCategory, targetCode),
      )
      .sort((left, right) => {
        const leftDimension = dimension(left.target.category, left.target.code);
        const rightDimension = dimension(right.target.category, right.target.code);

        const orderDiff =
          numberOrFallback(leftDimension?.dimensionOrderIndex) -
          numberOrFallback(rightDimension?.dimensionOrderIndex);

        if (orderDiff !== 0) {
          return orderDiff;
        }

        return compareText(left.target.code, right.target.code);
      });
  }

  function topScores(
    category: string,
    limit = 3,
    options?: {
      metric?: "weightedMeanScore" | "meanScore" | "normalizedScore" | "rawScore";
    },
  ) {
    const metric = options?.metric ?? "weightedMeanScore";

    return scoresByCategory(category)
      .filter((score) => getMetricValue(score, metric) !== null)
      .sort(
        (left, right) =>
          (getMetricValue(right, metric) ?? -Infinity) -
          (getMetricValue(left, metric) ?? -Infinity),
      )
      .slice(0, limit);
  }

  function lowScores(
    category: string,
    limit = 3,
    options?: {
      metric?: "weightedMeanScore" | "meanScore" | "normalizedScore" | "rawScore";
    },
  ) {
    const metric = options?.metric ?? "weightedMeanScore";

    return scoresByCategory(category)
      .filter((score) => getMetricValue(score, metric) !== null)
      .sort(
        (left, right) =>
          (getMetricValue(left, metric) ?? Infinity) -
          (getMetricValue(right, metric) ?? Infinity),
      )
      .slice(0, limit);
  }

  return {
    payload,

    scores,
    responses,
    dimensions,
    dimensionCategories,

    score,
    scoreRow,
    scoresByCategory,

    dimension,
    dimensionsByCategory,

    responsesByDimension,
    responsesByIntersection,

    scoreByIntersection,
    scoresByIntersection,

    topScores,
    lowScores,
  };
}

export function createReportSandboxData(payload: ReportSnapshotPayload | null | undefined) {
  const report = buildReportDataApi(payload);

  return {
    snapshot: report.payload,
    scores: report.scores,
    responses: report.responses,
    dimensions: report.dimensions,
    dimensionCategories: report.dimensionCategories,
  };
}