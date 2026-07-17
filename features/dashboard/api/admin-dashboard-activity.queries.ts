import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";

import {
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
  assessmentResultSnapshots,
  assessmentSessions,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";

export type AdminActivityAggregation = "day" | "week" | "month" | "quarter";
export type AdminActivityMetric = "respondents" | "sessions" | "snapshots";

export type AdminActivityTenantOption = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  available: boolean;
};

export type AdminActivityPoint = {
  date: string;
  label: string;
  value: number;
};

export type AdminActivitySeries = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  points: AdminActivityPoint[];
};

export type AdminActivityFailure = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  message: string;
};

export type AdminDashboardActivityResult = {
  tenantOptions: AdminActivityTenantOption[];
  selectedTenantSlugs: string[];
  metric: AdminActivityMetric;
  aggregation: AdminActivityAggregation;
  offset: number;
  from: string;
  to: string;
  rangeLabel: string;
  series: AdminActivitySeries[];
  aggregate: AdminActivityPoint[];
  failures: AdminActivityFailure[];
};

type ActivityRange = {
  aggregation: AdminActivityAggregation;
  offset: number;
  baseFrom: Date;
  baseInclusiveTo: Date;
  from: Date;
  to: Date;
  rangeLabel: string;
};

const ACTIVITY_TIME_ZONE = "Europe/Warsaw";

const BUCKET_COUNTS: Record<AdminActivityAggregation, number> = {
  day: 30,
  week: 16,
  month: 12,
  quarter: 8,
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseAdminActivityAggregation(
  value: string | string[] | undefined,
): AdminActivityAggregation {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "day" ||
    normalized === "week" ||
    normalized === "month" ||
    normalized === "quarter"
  ) {
    return normalized;
  }

  return "day";
}

export function parseAdminActivityMetric(
  value: string | string[] | undefined,
): AdminActivityMetric {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "respondents" ||
    normalized === "sessions" ||
    normalized === "snapshots"
  ) {
    return normalized;
  }

  return "sessions";
}

export function parseAdminActivityOffset(
  value: string | string[] | undefined,
) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(normalized ?? "0", 10);

  if (!Number.isFinite(parsed)) return 0;

  return Math.max(-120, Math.min(0, parsed));
}

export function parseAdminActivityDate(
  value: string | string[] | undefined,
): Date | null {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseAdminActivityTenants(
  value: string | string[] | undefined,
) {
  const raw = Array.isArray(value) ? value.join(",") : value ?? "";

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function startOfUtcWeek(date: Date) {
  const result = startOfUtcDay(date);
  const day = result.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  result.setUTCDate(result.getUTCDate() - daysFromMonday);
  return result;
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfUtcQuarter(date: Date) {
  const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1));
}

function startOfBucket(date: Date, aggregation: AdminActivityAggregation) {
  switch (aggregation) {
    case "week":
      return startOfUtcWeek(date);
    case "month":
      return startOfUtcMonth(date);
    case "quarter":
      return startOfUtcQuarter(date);
    default:
      return startOfUtcDay(date);
  }
}

function addBuckets(
  date: Date,
  aggregation: AdminActivityAggregation,
  amount: number,
) {
  const result = new Date(date);

  switch (aggregation) {
    case "week":
      result.setUTCDate(result.getUTCDate() + amount * 7);
      break;
    case "month":
      result.setUTCMonth(result.getUTCMonth() + amount);
      break;
    case "quarter":
      result.setUTCMonth(result.getUTCMonth() + amount * 3);
      break;
    default:
      result.setUTCDate(result.getUTCDate() + amount);
      break;
  }

  return result;
}

function createActivityRange({
  aggregation,
  offset,
  requestedFrom,
  requestedTo,
}: {
  aggregation: AdminActivityAggregation;
  offset: number;
  requestedFrom: Date | null;
  requestedTo: Date | null;
}): ActivityRange {
  const today = startOfUtcDay(new Date());
  const defaultBaseFrom = addBuckets(
    startOfBucket(today, aggregation),
    aggregation,
    -(BUCKET_COUNTS[aggregation] - 1),
  );

  let baseFrom = requestedFrom ? startOfUtcDay(requestedFrom) : defaultBaseFrom;
  let baseInclusiveTo = requestedTo ? startOfUtcDay(requestedTo) : today;

  if (baseFrom > baseInclusiveTo) {
    baseFrom = defaultBaseFrom;
    baseInclusiveTo = today;
  }

  const baseExclusiveTo = new Date(baseInclusiveTo);
  baseExclusiveTo.setUTCDate(baseExclusiveTo.getUTCDate() + 1);

  const duration = baseExclusiveTo.getTime() - baseFrom.getTime();
  const from = new Date(baseFrom.getTime() + offset * duration);
  const to = new Date(baseExclusiveTo.getTime() + offset * duration);
  const inclusiveTo = new Date(to.getTime() - 1);

  const formatter = new Intl.DateTimeFormat("pl-PL", {
    timeZone: ACTIVITY_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    aggregation,
    offset,
    baseFrom,
    baseInclusiveTo,
    from,
    to,
    rangeLabel: `${formatter.format(from)}–${formatter.format(inclusiveTo)}`,
  };
}

function getBucketSql(
  column:
    | typeof respondents.createdAt
    | typeof assessmentSessions.createdAt
    | typeof assessmentResultSnapshots.createdAt,
  aggregation: AdminActivityAggregation,
) {
  const unit =
    aggregation === "quarter"
      ? "quarter"
      : aggregation === "month"
        ? "month"
        : aggregation === "week"
          ? "week"
          : "day";

  return sql<string>`
    to_char(
      date_trunc(${unit}, timezone(${ACTIVITY_TIME_ZONE}, ${column})),
      'YYYY-MM-DD'
    )
  `;
}

function bucketKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatBucketLabel(date: Date, aggregation: AdminActivityAggregation) {
  if (aggregation === "week") {
    const end = addBuckets(date, "day", 6);
    const formatter = new Intl.DateTimeFormat("pl-PL", {
      timeZone: ACTIVITY_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
    });
    return `${formatter.format(date)}–${formatter.format(end)}`;
  }

  if (aggregation === "month") {
    return new Intl.DateTimeFormat("pl-PL", {
      timeZone: ACTIVITY_TIME_ZONE,
      month: "short",
      year: "numeric",
    }).format(date);
  }

  if (aggregation === "quarter") {
    return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: ACTIVITY_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function buildPoints({
  range,
  rows,
}: {
  range: ActivityRange;
  rows: Array<{ date: string; value: unknown }>;
}) {
  const byDate = new Map(rows.map((row) => [row.date, numberValue(row.value)]));
  const points: AdminActivityPoint[] = [];

  let cursor = startOfBucket(range.from, range.aggregation);

  while (cursor < range.to) {
    const date = bucketKey(cursor);
    points.push({
      date,
      label: formatBucketLabel(cursor, range.aggregation),
      value: byDate.get(date) ?? 0,
    });
    cursor = addBuckets(cursor, range.aggregation, 1);
  }

  return points;
}

async function queryMetricRows({
  db,
  metric,
  aggregation,
  from,
  to,
}: {
  db: ReturnType<typeof getTenantDbByConnection>;
  metric: AdminActivityMetric;
  aggregation: AdminActivityAggregation;
  from: Date;
  to: Date;
}) {
  if (metric === "respondents") {
    const bucket = getBucketSql(respondents.createdAt, aggregation);
    return db
      .select({ date: bucket, value: count(respondents.id) })
      .from(respondents)
      .where(
        and(
          isNull(respondents.deletedAt),
          gte(respondents.createdAt, from),
          lt(respondents.createdAt, to),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);
  }

  if (metric === "snapshots") {
    const bucket = getBucketSql(assessmentResultSnapshots.createdAt, aggregation);
    return db
      .select({ date: bucket, value: count(assessmentResultSnapshots.id) })
      .from(assessmentResultSnapshots)
      .where(
        and(
          isNull(assessmentResultSnapshots.deletedAt),
          gte(assessmentResultSnapshots.createdAt, from),
          lt(assessmentResultSnapshots.createdAt, to),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);
  }

  const bucket = getBucketSql(assessmentSessions.createdAt, aggregation);
  return db
    .select({ date: bucket, value: count(assessmentSessions.id) })
    .from(assessmentSessions)
    .where(
      and(
        isNull(assessmentSessions.deletedAt),
        gte(assessmentSessions.createdAt, from),
        lt(assessmentSessions.createdAt, to),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);
}

export async function getAdminDashboardActivity({
  selectedTenantSlugs,
  metric,
  aggregation,
  offset,
  requestedFrom,
  requestedTo,
}: {
  selectedTenantSlugs: string[];
  metric: AdminActivityMetric;
  aggregation: AdminActivityAggregation;
  offset: number;
  requestedFrom: Date | null;
  requestedTo: Date | null;
}): Promise<AdminDashboardActivityResult> {
  const range = createActivityRange({
    aggregation,
    offset,
    requestedFrom,
    requestedTo,
  });

  const connections = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      databaseName: tenantDatabaseConnections.databaseName,
      databaseUrlEncrypted: tenantDatabaseConnections.databaseUrlEncrypted,
      migrationStatus: tenantDatabaseConnections.migrationStatus,
      schemaVersion: tenantDatabaseConnections.schemaVersion,
    })
    .from(tenants)
    .leftJoin(
      tenantDatabaseConnections,
      eq(tenantDatabaseConnections.tenantId, tenants.id),
    )
    .where(and(eq(tenants.status, "active"), isNull(tenants.deletedAt)));

  const tenantOptions = connections
    .map((connection) => ({
      tenantId: connection.tenantId,
      tenantSlug: connection.tenantSlug,
      tenantName: connection.tenantName,
      available:
        Boolean(connection.databaseName && connection.databaseUrlEncrypted) &&
        connection.migrationStatus === "success",
    }))
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName, "pl"));

  const availableSlugs = new Set(
    tenantOptions.filter((item) => item.available).map((item) => item.tenantSlug),
  );

  const normalizedSelected = selectedTenantSlugs.filter((slug) =>
    availableSlugs.has(slug),
  );

  const effectiveSlugs =
    normalizedSelected.length > 0
      ? normalizedSelected
      : tenantOptions.filter((item) => item.available).map((item) => item.tenantSlug);

  const selectedConnections = connections.filter((connection) =>
    effectiveSlugs.includes(connection.tenantSlug),
  );

  const settled = await Promise.allSettled(
    selectedConnections.map(async (connection): Promise<AdminActivitySeries> => {
      if (!connection.databaseName || !connection.databaseUrlEncrypted) {
        throw new Error("Brak skonfigurowanej bazy partnera.");
      }

      if (connection.migrationStatus !== "success") {
        throw new Error("Baza partnera nie jest gotowa do odczytu.");
      }

      const db = getTenantDbByConnection({
        tenantId: connection.tenantId,
        databaseName: connection.databaseName,
        schemaVersion: Number(connection.schemaVersion ?? 0),
        databaseUrl: decryptSecret(connection.databaseUrlEncrypted),
      });

      const rows = await queryMetricRows({
        db,
        metric,
        aggregation,
        from: range.from,
        to: range.to,
      });

      return {
        tenantId: connection.tenantId,
        tenantSlug: connection.tenantSlug,
        tenantName: connection.tenantName,
        points: buildPoints({ range, rows }),
      };
    }),
  );

  const series: AdminActivitySeries[] = [];
  const failures: AdminActivityFailure[] = [];

  settled.forEach((result, index) => {
    const connection = selectedConnections[index];

    if (result.status === "fulfilled") {
      series.push(result.value);
      return;
    }

    failures.push({
      tenantId: connection.tenantId,
      tenantSlug: connection.tenantSlug,
      tenantName: connection.tenantName,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : "Nie udało się pobrać danych partnera.",
    });
  });

  series.sort((a, b) => a.tenantName.localeCompare(b.tenantName, "pl"));

  const aggregateMap = new Map<string, AdminActivityPoint>();

  for (const item of series) {
    for (const point of item.points) {
      const current = aggregateMap.get(point.date);
      aggregateMap.set(point.date, {
        date: point.date,
        label: point.label,
        value: (current?.value ?? 0) + point.value,
      });
    }
  }

  const aggregate = Array.from(aggregateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    tenantOptions,
    // Pusta lista oznacza tryb „wszyscy partnerzy” agregowany do jednej linii.
    // `effectiveSlugs` służy wyłącznie do pobrania danych z wszystkich gotowych baz.
    selectedTenantSlugs: normalizedSelected,
    metric,
    aggregation,
    offset,
    from: formatInputDate(range.baseFrom),
    to: formatInputDate(range.baseInclusiveTo),
    rangeLabel: range.rangeLabel,
    series,
    aggregate,
    failures,
  };
}