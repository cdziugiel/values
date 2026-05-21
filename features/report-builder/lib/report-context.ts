// features/report-builder/lib/report-context.ts

type SnapshotScore = {
  dimensionId?: string | null;
  dimensionCode?: string | null;
  dimensionName?: string | null;
  dimensionCategory?: string | null;
  dimensionCategoryLabel?: string | null;
  dimensionOrderIndex?: number | string | null;

  rawScore?: unknown;
  weightedScore?: unknown;
  meanScore?: unknown;
  weightedMeanScore?: unknown;
  normalizedScore?: unknown;
  answeredItemsCount?: unknown;
  expectedItemsCount?: unknown;
  completeness?: unknown;
};

type SnapshotResponseDimension = {
  dimensionId?: string | null;
  dimensionCode?: string | null;
  dimensionName?: string | null;
  dimensionCategory?: string | null;
  dimensionCategoryLabel?: string | null;
  dimensionOrderIndex?: number | string | null;
  weight?: unknown;
  reverseScored?: boolean | null;
};

type SnapshotResponse = {
  itemId?: string | null;
  itemCode?: string | null;
  itemText?: string | null;
  itemHelpText?: string | null;
  itemType?: string | null;
  itemOrderIndex?: number | string | null;

  pageId?: string | null;
  pageCode?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
  pageOrderIndex?: number | string | null;

  responseExists?: boolean | null;
  responseRawValue?: unknown;
  responseNumericValue?: unknown;
  responseDisplayValue?: unknown;

  dimensions?: SnapshotResponseDimension[] | null;
};

type SnapshotPayload = {
  version?: number | null;
  tenantSlug?: string | null;
  frozenAt?: string | Date | null;

  session?: Record<string, unknown> | null;
  project?: Record<string, unknown> | null;
  questionnaires?: unknown[] | null;

  dimensionCategories?: unknown[] | null;
  dimensions?: unknown[] | null;
  scores?: SnapshotScore[] | null;
  responses?: SnapshotResponse[] | null;
  analytics?: Record<string, unknown> | null;
  crossScores?: unknown;
};

type ReportScore = {
  dimensionId: string | null;
  dimensionCode: string;
  dimensionName: string;
  dimensionCategory: string;
  dimensionCategoryLabel: string;
  dimensionOrderIndex: number;

  rawScore: number | null;
  weightedScore: number | null;
  meanScore: number | null;
  weightedMeanScore: number | null;
  normalizedScore: number | null;
  answeredItemsCount: number | null;
  expectedItemsCount: number | null;
  completeness: number | null;
};

type CrossScore = {
  primaryCategory: string;
  primaryCode: string;
  filterCategory: string;
  filterCode: string;

  itemsCount: number;
  answeredItemsCount: number;

  rawSum: number;
  meanScore: number | null;
  weightedSum: number;
  weightedMeanScore: number | null;
  weightSum: number;
  completeness: number | null;
};

type ResponsesPageGroup = {
  pageId: string;
  pageCode: string | null;
  pageTitle: string;
  pageDescription: string | null;
  pageOrderIndex: number;
  responses: SnapshotResponse[];
};


export type ReportScoreMetric = {
  rawScore?: number | null;
  weightedScore?: number | null;
  meanScore?: number | null;
  weightedMeanScore?: number | null;
  normalizedScore?: number | null;
  completeness?: number | null;
};

export type ReportCrossScoreNode = ReportScoreMetric & {
  by?: Record<string, Record<string, ReportScoreMetric>>;
};

export type ReportCrossScores = Record<
  string,
  Record<string, ReportCrossScoreNode>
>;

const DEFAULT_CATEGORY = "__NO_CATEGORY__";
const DEFAULT_CATEGORY_LABEL = "Bez kategorii";
const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER;


function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function metricFromRecord(value: unknown): ReportScoreMetric {
  if (!isRecord(value)) {
    return {};
  }

  return {
    rawScore: numberOrNull(value.rawScore),
    weightedScore: numberOrNull(value.weightedScore),
    meanScore: numberOrNull(value.meanScore),
    weightedMeanScore: numberOrNull(value.weightedMeanScore),
    normalizedScore: numberOrNull(value.normalizedScore),
    completeness: numberOrNull(value.completeness),
  };
}

function normalizeCrossScores(value: unknown): ReportCrossScores {
  if (!isRecord(value)) {
    return {};
  }

  const result: ReportCrossScores = {};

  for (const [targetCategory, targetCategoryValue] of Object.entries(value)) {
    if (!isRecord(targetCategoryValue)) {
      continue;
    }

    result[targetCategory] = {};

    for (const [targetCode, targetScoreValue] of Object.entries(targetCategoryValue)) {
      if (!isRecord(targetScoreValue)) {
        continue;
      }

      const node: ReportCrossScoreNode = {
        ...metricFromRecord(targetScoreValue),
        by: {},
      };

      const by = targetScoreValue.by;

      if (isRecord(by)) {
        for (const [filterCategory, filterCategoryValue] of Object.entries(by)) {
          if (!isRecord(filterCategoryValue)) {
            continue;
          }

          node.by ??= {};
          node.by[filterCategory] = {};

          for (const [filterCode, metricValue] of Object.entries(filterCategoryValue)) {
            node.by[filterCategory][filterCode] = metricFromRecord(metricValue);
          }
        }
      }

      result[targetCategory][normalizeDimensionCode(targetCode)] = node;
    }
  }

  return result;
}

function stringOrFallback(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();

  return normalized || fallback;
}

function stringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
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

function numberOrFallback(value: unknown, fallback = FALLBACK_ORDER) {
  const parsed = numberOrNull(value);

  return parsed ?? fallback;
}

function compareText(left: unknown, right: unknown) {
  return String(left ?? "").localeCompare(String(right ?? ""), "pl", {
    sensitivity: "base",
    numeric: true,
  });
}

function normalizeDimensionCode(value: unknown) {
  return stringOrFallback(value, "UNKNOWN").trim().toUpperCase();
}

function normalizeCategory(value: unknown) {
  return stringOrFallback(value, DEFAULT_CATEGORY).trim();
}

function normalizeCategoryLabel(value: unknown, fallbackCategory: string) {
  if (fallbackCategory === DEFAULT_CATEGORY) {
    return DEFAULT_CATEGORY_LABEL;
  }

  return stringOrFallback(value, fallbackCategory);
}

function toScore(score: SnapshotScore): ReportScore {
  const category = normalizeCategory(score.dimensionCategory);

  return {
    dimensionId: stringOrNull(score.dimensionId),
    dimensionCode: normalizeDimensionCode(score.dimensionCode),
    dimensionName: stringOrFallback(score.dimensionName, "Nieznany wymiar"),
    dimensionCategory: category,
    dimensionCategoryLabel: normalizeCategoryLabel(
      score.dimensionCategoryLabel,
      category,
    ),
    dimensionOrderIndex: numberOrFallback(score.dimensionOrderIndex),

    rawScore: numberOrNull(score.rawScore),
    weightedScore: numberOrNull(score.weightedScore),
    meanScore: numberOrNull(score.meanScore),
    weightedMeanScore: numberOrNull(score.weightedMeanScore),
    normalizedScore: numberOrNull(score.normalizedScore),
    answeredItemsCount: numberOrNull(score.answeredItemsCount),
    expectedItemsCount: numberOrNull(score.expectedItemsCount),
    completeness: numberOrNull(score.completeness),
  };
}

function sortScores(scores: ReportScore[]) {
  return [...scores].sort((a, b) => {
    const categoryDiff = compareText(a.dimensionCategory, b.dimensionCategory);

    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    const orderDiff = a.dimensionOrderIndex - b.dimensionOrderIndex;

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return compareText(a.dimensionCode, b.dimensionCode);
  });
}

function buildScoresIndex(scores: ReportScore[]) {
  const byCategory: Record<string, ReportScore[]> = {};
  const byCode: Record<string, ReportScore> = {};
  const nested: Record<string, Record<string, ReportScore>> = {};

  for (const score of sortScores(scores)) {
    byCategory[score.dimensionCategory] ??= [];
    byCategory[score.dimensionCategory].push(score);

    byCode[score.dimensionCode] = score;

    nested[score.dimensionCategory] ??= {};
    nested[score.dimensionCategory][score.dimensionCode] = score;
  }

  return {
    list: sortScores(scores),
    byCategory,
    byCode,
    ...nested,
  };
}

function getResponseNumericValue(response: SnapshotResponse) {
  const explicit = numberOrNull(response.responseNumericValue);

  if (explicit !== null) {
    return explicit;
  }

  if (typeof response.responseRawValue === "number") {
    return response.responseRawValue;
  }

  return null;
}

function getResponseWeightForDimension(
  response: SnapshotResponse,
  category: string,
  code: string,
) {
  const dimensions = Array.isArray(response.dimensions)
    ? response.dimensions
    : [];

  const dimension = dimensions.find(
    (candidate) =>
      normalizeCategory(candidate.dimensionCategory) === category &&
      normalizeDimensionCode(candidate.dimensionCode) === code,
  );

  return numberOrNull(dimension?.weight) ?? 1;
}

function responseHasDimension(
  response: SnapshotResponse,
  category: string,
  code: string,
) {
  const dimensions = Array.isArray(response.dimensions)
    ? response.dimensions
    : [];

  return dimensions.some(
    (dimension) =>
      normalizeCategory(dimension.dimensionCategory) === category &&
      normalizeDimensionCode(dimension.dimensionCode) === code,
  );
}

function buildCrossScores(responses: SnapshotResponse[]) {
  const categories = new Map<string, Set<string>>();

  for (const response of responses) {
    const dimensions = Array.isArray(response.dimensions)
      ? response.dimensions
      : [];

    for (const dimension of dimensions) {
      const category = normalizeCategory(dimension.dimensionCategory);
      const code = normalizeDimensionCode(dimension.dimensionCode);

      categories.set(category, categories.get(category) ?? new Set());
      categories.get(category)?.add(code);
    }
  }

  const result: Record<
    string,
    Record<
      string,
      {
        by: Record<string, Record<string, CrossScore>>;
      }
    >
  > = {};

  for (const [primaryCategory, primaryCodes] of categories.entries()) {
    result[primaryCategory] ??= {};

    for (const primaryCode of primaryCodes) {
      result[primaryCategory][primaryCode] ??= {
        by: {},
      };

      for (const [filterCategory, filterCodes] of categories.entries()) {
        if (filterCategory === primaryCategory) {
          continue;
        }

        result[primaryCategory][primaryCode].by[filterCategory] ??= {};

        for (const filterCode of filterCodes) {
          const matchingResponses = responses.filter(
            (response) =>
              responseHasDimension(response, primaryCategory, primaryCode) &&
              responseHasDimension(response, filterCategory, filterCode),
          );

          const answeredResponses = matchingResponses.filter(
            (response) =>
              response.responseExists === true &&
              getResponseNumericValue(response) !== null,
          );

          let rawSum = 0;
          let weightedSum = 0;
          let weightSum = 0;

          for (const response of answeredResponses) {
            const numericValue = getResponseNumericValue(response);

            if (numericValue === null) {
              continue;
            }

            const weight = getResponseWeightForDimension(
              response,
              primaryCategory,
              primaryCode,
            );

            rawSum += numericValue;
            weightedSum += numericValue * weight;
            weightSum += weight;
          }

          const answeredItemsCount = answeredResponses.length;
          const itemsCount = matchingResponses.length;

          result[primaryCategory][primaryCode].by[filterCategory][filterCode] = {
            primaryCategory,
            primaryCode,
            filterCategory,
            filterCode,
            itemsCount,
            answeredItemsCount,
            rawSum,
            meanScore:
              answeredItemsCount > 0 ? rawSum / answeredItemsCount : null,
            weightedSum,
            weightedMeanScore:
              weightSum > 0 ? weightedSum / weightSum : null,
            weightSum,
            completeness:
              itemsCount > 0 ? answeredItemsCount / itemsCount : null,
          };
        }
      }
    }
  }

  return result;
}

function groupResponsesByPage(responses: SnapshotResponse[]): ResponsesPageGroup[] {
  const groups = new Map<string, ResponsesPageGroup>();

  for (const response of responses) {
    const pageId = stringOrFallback(response.pageId, "__NO_PAGE__");

    const existing = groups.get(pageId);

    if (existing) {
      existing.responses.push(response);
      continue;
    }

    groups.set(pageId, {
      pageId,
      pageCode: stringOrNull(response.pageCode),
      pageTitle: stringOrFallback(response.pageTitle, "Pozostałe odpowiedzi"),
      pageDescription: stringOrNull(response.pageDescription),
      pageOrderIndex: numberOrFallback(response.pageOrderIndex),
      responses: [response],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      responses: [...group.responses].sort(
        (a, b) =>
          numberOrFallback(a.itemOrderIndex) -
            numberOrFallback(b.itemOrderIndex) ||
          compareText(a.itemText, b.itemText),
      ),
    }))
    .sort(
      (a, b) =>
        a.pageOrderIndex - b.pageOrderIndex ||
        compareText(a.pageTitle, b.pageTitle),
    );
}

export function buildReportContext(payload: SnapshotPayload | null | undefined) {
  const scores = Array.isArray(payload?.scores)
    ? payload.scores.map(toScore)
    : [];

  const responses = Array.isArray(payload?.responses)
    ? payload.responses
    : [];

  const answeredResponses = responses.filter(
    (response) => response.responseExists === true,
  );

const scoresIndex = buildScoresIndex(scores);

const calculatedCrossScores = buildCrossScores(responses);

const crossScoresSource =
  payload?.crossScores ??
  payload?.analytics?.crossScores ??
  calculatedCrossScores;

const crossScores = normalizeCrossScores(crossScoresSource);

const responsesByPage = groupResponsesByPage(responses);

  return {
    version: 1,

    payload,

    tenantSlug: payload?.tenantSlug ?? null,
    frozenAt: payload?.frozenAt ?? null,

    session: payload?.session ?? null,
    project: payload?.project ?? null,
    questionnaires: payload?.questionnaires ?? [],

    dimensionCategories: payload?.dimensionCategories ?? [],
    dimensions: payload?.dimensions ?? [],

    scores: scoresIndex,
    scoresList: scoresIndex.list,
    scoresByCategory: scoresIndex.byCategory,

    crossScores,

    responses,
    responsesByPage,

    metrics: {
      totalResponsesCount: responses.length,
      answeredResponsesCount: answeredResponses.length,
      completionRate:
        responses.length > 0 ? answeredResponses.length / responses.length : 0,
    },

    helpers: {
      formatNumber(value: unknown, digits = 2) {
        const parsed = numberOrNull(value);

        if (parsed === null) {
          return "—";
        }

        return Number(parsed.toFixed(digits)).toString();
      },

      formatPercent(value: unknown) {
        const parsed = numberOrNull(value);

        if (parsed === null) {
          return "—";
        }

        return `${Math.round(parsed * 100)}%`;
      },
    },
  };
}

export type ReportContext = ReturnType<typeof buildReportContext>;