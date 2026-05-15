// features/report-builder/lib/report-condition.ts

export type ReportPathCondition =
  | null
  | undefined
  | {
      path?: string;
      eq?: unknown;
      ne?: unknown;
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
      exists?: boolean;
      includes?: unknown;
      all?: ReportPathCondition[];
      any?: ReportPathCondition[];
      not?: ReportPathCondition;
    };

function getByPath(source: unknown, path: string) {
  const parts = path.split(".").filter(Boolean);
  let current: any = source;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

function asNumber(value: unknown) {
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

export function evaluateReportPathCondition(
  condition: ReportPathCondition,
  context: unknown,
): boolean {
  if (!condition) {
    return true;
  }

  if (Array.isArray(condition.all)) {
    return condition.all.every((child) =>
      evaluateReportPathCondition(child, context),
    );
  }

  if (Array.isArray(condition.any)) {
    return condition.any.some((child) =>
      evaluateReportPathCondition(child, context),
    );
  }

  if (condition.not) {
    return !evaluateReportPathCondition(condition.not, context);
  }

  if (!condition.path) {
    return true;
  }

  const value = getByPath(context, condition.path);

  if (typeof condition.exists === "boolean") {
    const exists = value !== undefined && value !== null;

    if (exists !== condition.exists) {
      return false;
    }
  }

  if ("eq" in condition && value !== condition.eq) {
    return false;
  }

  if ("ne" in condition && value === condition.ne) {
    return false;
  }

  if (typeof condition.gt === "number") {
    const parsed = asNumber(value);

    if (parsed === null || parsed <= condition.gt) {
      return false;
    }
  }

  if (typeof condition.gte === "number") {
    const parsed = asNumber(value);

    if (parsed === null || parsed < condition.gte) {
      return false;
    }
  }

  if (typeof condition.lt === "number") {
    const parsed = asNumber(value);

    if (parsed === null || parsed >= condition.lt) {
      return false;
    }
  }

  if (typeof condition.lte === "number") {
    const parsed = asNumber(value);

    if (parsed === null || parsed > condition.lte) {
      return false;
    }
  }

  if ("includes" in condition) {
    if (!Array.isArray(value) || !value.includes(condition.includes)) {
      return false;
    }
  }

  return true;
}