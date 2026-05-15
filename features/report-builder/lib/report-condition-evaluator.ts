// features/report-builder/lib/report-condition-evaluator.ts



import type { ReportDataApi } from "../types/report-builder.types";

export type ReportConditionOperator =
  | "exists"
  | "not_exists"
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in";

export type ReportScoreMetric =
  | "weightedMeanScore"
  | "meanScore"
  | "normalizedScore"
  | "rawScore";

export type ReportIntersectionMetric = "weightedMeanScore" | "meanScore";

export type ReportCondition =
  | {
      type: "score";
      category: string;
      code: string;
      metric?: ReportScoreMetric;
      operator: ReportConditionOperator;
      value?: unknown;
      min?: number;
      max?: number;
      values?: unknown[];
    }
  | {
      type: "intersection_score";
      filterCategory: string;
      filterCode: string;
      targetCategory: string;
      targetCode: string;
      metric?: ReportIntersectionMetric;
      operator: ReportConditionOperator;
      value?: unknown;
      min?: number;
      max?: number;
      values?: unknown[];
    }
  | {
      type: "and";
      conditions: ReportCondition[];
    }
  | {
      type: "or";
      conditions: ReportCondition[];
    }
  | {
      type: "not";
      condition: ReportCondition;
    };


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

function compareValues({
  current,
  operator,
  value,
  min,
  max,
  values,
}: {
  current: unknown;
  operator: ReportConditionOperator;
  value?: unknown;
  min?: number;
  max?: number;
  values?: unknown[];
}) {
  if (operator === "exists") {
    return current !== null && current !== undefined;
  }

  if (operator === "not_exists") {
    return current === null || current === undefined;
  }

  if (operator === "eq") {
    return String(current) === String(value);
  }

  if (operator === "neq") {
    return String(current) !== String(value);
  }

  if (operator === "in") {
    return Array.isArray(values)
      ? values.map(String).includes(String(current))
      : false;
  }

  const currentNumber = numberOrNull(current);
  const valueNumber = numberOrNull(value);

  if (currentNumber === null) {
    return false;
  }

  if (operator === "gt") {
    return valueNumber !== null && currentNumber > valueNumber;
  }

  if (operator === "gte") {
    return valueNumber !== null && currentNumber >= valueNumber;
  }

  if (operator === "lt") {
    return valueNumber !== null && currentNumber < valueNumber;
  }

  if (operator === "lte") {
    return valueNumber !== null && currentNumber <= valueNumber;
  }

  if (operator === "between") {
    if (typeof min !== "number" || typeof max !== "number") {
      return false;
    }

    return currentNumber >= min && currentNumber <= max;
  }

  return false;
}

export function evaluateReportCondition(
  condition: ReportCondition | null | undefined,
  report: ReportDataApi,
): boolean {
  if (!condition) {
    return true;
  }

  if (condition.type === "and") {
    return condition.conditions.every((childCondition) =>
      evaluateReportCondition(childCondition, report),
    );
  }

  if (condition.type === "or") {
    return condition.conditions.some((childCondition) =>
      evaluateReportCondition(childCondition, report),
    );
  }

  if (condition.type === "not") {
    return !evaluateReportCondition(condition.condition, report);
  }

  if (condition.type === "score") {
    const current = report.score(condition.category, condition.code, {
      prefer: condition.metric ?? "weightedMeanScore",
    });

    return compareValues({
      current,
      operator: condition.operator,
      value: condition.value,
      min: condition.min,
      max: condition.max,
      values: condition.values,
    });
  }

  if (condition.type === "intersection_score") {
    const intersection = report.scoreByIntersection(
      condition.filterCategory,
      condition.filterCode,
      condition.targetCategory,
      condition.targetCode,
    );

    const current =
      condition.metric === "meanScore"
        ? intersection.meanScore
        : intersection.weightedMeanScore;

    return compareValues({
      current,
      operator: condition.operator,
      value: condition.value,
      min: condition.min,
      max: condition.max,
      values: condition.values,
    });
  }

  return false;
}