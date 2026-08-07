import type {
  ComparisonCrossDeltaRow,
  ComparisonCrossScoreMetric,
  ComparisonCrossScores,
} from "../types/comparison-report.types";
import { resolveComparisonMeaning } from "./comparison-deltas";

function norm(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function findKey(obj: Record<string, unknown> | null | undefined, key: string) {
  if (!obj) return null;
  const wanted = norm(key);
  return Object.keys(obj).find((candidate) => norm(candidate) === wanted) ?? null;
}

function getMetric(
  crossScores: ComparisonCrossScores | null | undefined,
  targetCategory: string,
  targetCode: string,
  filterCategory: string,
  filterCode: string,
): ComparisonCrossScoreMetric | null {
  if (!crossScores) return null;

  const targetCategoryKey = findKey(crossScores as Record<string, unknown>, targetCategory);
  if (!targetCategoryKey) return null;

  const targetMap = crossScores[targetCategoryKey];
  const targetCodeKey = findKey(targetMap as Record<string, unknown>, targetCode);
  if (!targetCodeKey) return null;

  const by = targetMap[targetCodeKey]?.by;
  if (!by) return null;

  const filterCategoryKey = findKey(by as Record<string, unknown>, filterCategory);
  if (!filterCategoryKey) return null;

  const filterMap = by[filterCategoryKey];
  const filterCodeKey = findKey(filterMap as Record<string, unknown>, filterCode);
  if (!filterCodeKey) return null;

  return filterMap[filterCodeKey] ?? null;
}

function metricValue(metric: ComparisonCrossScoreMetric | null) {
  if (!metric) return null;

  for (const candidate of [metric.weightedMeanScore, metric.meanScore]) {
    if (candidate === null || candidate === undefined) continue;
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }

  return null;
}

function targetCodes(
  crossScores: ComparisonCrossScores | null | undefined,
  targetCategory: string,
) {
  if (!crossScores) return [];

  const categoryKey = findKey(crossScores as Record<string, unknown>, targetCategory);
  return categoryKey ? Object.keys(crossScores[categoryKey] ?? {}) : [];
}

function filterCodes(
  crossScores: ComparisonCrossScores | null | undefined,
  targetCategory: string,
  targetCode: string,
  filterCategory: string,
) {
  if (!crossScores) return [];

  const categoryKey = findKey(crossScores as Record<string, unknown>, targetCategory);
  if (!categoryKey) return [];

  const targetMap = crossScores[categoryKey];
  const targetCodeKey = findKey(targetMap as Record<string, unknown>, targetCode);
  if (!targetCodeKey) return [];

  const by = targetMap[targetCodeKey]?.by;
  if (!by) return [];

  const filterCategoryKey = findKey(by as Record<string, unknown>, filterCategory);
  return filterCategoryKey ? Object.keys(by[filterCategoryKey] ?? {}) : [];
}

function uniqueNormalized(values: string[]) {
  const map = new Map<string, string>();

  for (const value of values) {
    const key = norm(value);
    if (key && !map.has(key)) map.set(key, value);
  }

  return Array.from(map.values());
}

export function buildComparisonCrossDeltaRows({
  leftCrossScores,
  rightCrossScores,
  targetCategory,
  filterCategory,
}: {
  leftCrossScores?: ComparisonCrossScores | null;
  rightCrossScores?: ComparisonCrossScores | null;
  targetCategory: string;
  filterCategory: string;
}): ComparisonCrossDeltaRow[] {
  const rows: ComparisonCrossDeltaRow[] = [];

  const allTargetCodes = uniqueNormalized([
    ...targetCodes(leftCrossScores, targetCategory),
    ...targetCodes(rightCrossScores, targetCategory),
  ]);

  for (const targetCode of allTargetCodes) {
    const allFilterCodes = uniqueNormalized([
      ...filterCodes(leftCrossScores, targetCategory, targetCode, filterCategory),
      ...filterCodes(rightCrossScores, targetCategory, targetCode, filterCategory),
    ]);

    for (const filterCode of allFilterCodes) {
      const leftScore = metricValue(
        getMetric(
          leftCrossScores,
          targetCategory,
          targetCode,
          filterCategory,
          filterCode,
        ),
      );

      const rightScore = metricValue(
        getMetric(
          rightCrossScores,
          targetCategory,
          targetCode,
          filterCategory,
          filterCode,
        ),
      );

      const delta =
        leftScore == null || rightScore == null
          ? null
          : leftScore - rightScore;

      const absDelta = delta == null ? null : Math.abs(delta);

      rows.push({
        targetCategory,
        targetCode: norm(targetCode),
        filterCategory,
        filterCode: norm(filterCode),
        leftScore,
        rightScore,
        delta,
        absDelta,
        meaning: resolveComparisonMeaning(absDelta),
      });
    }
  }

  return rows;
}
