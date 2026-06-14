// app/(protected)/t/[tenantSlug]/dashboard/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import {
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  lt,
  sql,
} from "drizzle-orm";

import {
  TenantActivityLineChart,
  type TenantActivityPoint,
} from "@/features/dashboard/components/tenant-activity-line-chart";



import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  KeyRound,
  Layers3,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/ui";

import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { getTenantDb } from "@/server/db/tenant-db";
import { controlDb } from "@/server/db/control-db";

import {
  assessmentProjects,
  assessmentResultSnapshots,
  assessmentSessions,
  respondents,
} from "@/drizzle/schema/tenant-schema";

import { reportAccessCodes, reportAccessOrders } from "@/drizzle/schema";

type TenantDashboardPageProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
  searchParams: Promise<{
    activityAggregation?: string | string[];
    activityOffset?: string | string[];
    activityFrom?: string | string[];
    activityTo?: string | string[];
  }>;
};
function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: unknown, currency = "PLN") {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) return "—";

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(parsed);
}

function getSessionStatusLabel(status: string | null) {
  switch (status) {
    case "not_started":
      return "Nierozpoczęte";
    case "in_progress":
      return "W trakcie";
    case "completed":
      return "Zakończone";
    case "cancelled":
      return "Anulowane";
    default:
      return status ?? "—";
  }
}

function getOrderStatusLabel(status: string | null) {
  switch (status) {
    case "draft":
      return "Szkic";
    case "pending_payment":
      return "Oczekuje na płatność";
    case "paid":
      return "Opłacone";
    case "failed":
      return "Nieudane";
    case "cancelled":
      return "Anulowane";
    case "refunded":
      return "Zwrócone";
    default:
      return status ?? "—";
  }
}

function getStatusBadgeClass(status: string | null) {
  if (status === "completed" || status === "paid") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "in_progress" || status === "pending_payment") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "cancelled" || status === "failed" || status === "refunded") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
}

type ActivityAggregation = "day" | "week" | "month" | "quarter";

type ActivityRange = {
  aggregation: ActivityAggregation;
  offset: number;
  bucketCount: number;

  baseFrom: Date;
  baseInclusiveTo: Date;

  from: Date;
  to: Date;

  rangeLabel: string;
};

const ACTIVITY_TIME_ZONE = "Europe/Warsaw";

const ACTIVITY_AGGREGATION_CONFIG: Record<
  ActivityAggregation,
  {
    bucketCount: number;
    label: string;
  }
> = {
  day: {
    bucketCount: 30,
    label: "Dni",
  },
  week: {
    bucketCount: 16,
    label: "Tygodnie",
  },
  month: {
    bucketCount: 12,
    label: "Miesiące",
  },
  quarter: {
    bucketCount: 8,
    label: "Kwartały",
  },
};

function parseActivityAggregation(
  value: string | string[] | undefined,
): ActivityAggregation {
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

function parseActivityOffset(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(normalized ?? "0", 10);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(-120, Math.min(0, parsed));
}


function parseActivityDate(
  value: string | string[] | undefined,
): Date | null {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatActivityInputDate(date: Date) {
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
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
}

function startOfUtcQuarter(date: Date) {
  const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3;

  return new Date(
    Date.UTC(date.getUTCFullYear(), quarterMonth, 1),
  );
}

function startOfActivityBucket(
  date: Date,
  aggregation: ActivityAggregation,
) {
  switch (aggregation) {
    case "week":
      return startOfUtcWeek(date);

    case "month":
      return startOfUtcMonth(date);

    case "quarter":
      return startOfUtcQuarter(date);

    case "day":
    default:
      return startOfUtcDay(date);
  }
}

function addActivityBuckets(
  date: Date,
  aggregation: ActivityAggregation,
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

    case "day":
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
  aggregation: ActivityAggregation;
  offset: number;
  requestedFrom: Date | null;
  requestedTo: Date | null;
}): ActivityRange {
  const configuredBucketCount =
    ACTIVITY_AGGREGATION_CONFIG[aggregation].bucketCount;

  const today = startOfUtcDay(new Date());

  const defaultBaseInclusiveTo = today;

  const defaultBaseFrom = addActivityBuckets(
    startOfActivityBucket(today, aggregation),
    aggregation,
    -(configuredBucketCount - 1),
  );

  let baseFrom = requestedFrom
    ? startOfUtcDay(requestedFrom)
    : defaultBaseFrom;

  let baseInclusiveTo = requestedTo
    ? startOfUtcDay(requestedTo)
    : defaultBaseInclusiveTo;

  if (baseFrom > baseInclusiveTo) {
    baseFrom = defaultBaseFrom;
    baseInclusiveTo = defaultBaseInclusiveTo;
  }

  const baseExclusiveTo = new Date(baseInclusiveTo);

  baseExclusiveTo.setUTCDate(baseExclusiveTo.getUTCDate() + 1);

  const baseDurationMs =
    baseExclusiveTo.getTime() - baseFrom.getTime();

  const shiftedFrom = new Date(
    baseFrom.getTime() + offset * baseDurationMs,
  );

  const shiftedTo = new Date(
    baseExclusiveTo.getTime() + offset * baseDurationMs,
  );

  const firstBucket = startOfActivityBucket(
    shiftedFrom,
    aggregation,
  );

  let bucketCount = 0;
  let cursor = firstBucket;

  while (cursor < shiftedTo) {
    bucketCount += 1;

    cursor = addActivityBuckets(
      cursor,
      aggregation,
      1,
    );
  }

  const rangeFormatter = new Intl.DateTimeFormat("pl-PL", {
    timeZone: ACTIVITY_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const shiftedInclusiveTo = new Date(
    shiftedTo.getTime() - 1,
  );

  return {
    aggregation,
    offset,
    bucketCount,

    baseFrom,
    baseInclusiveTo,

    from: shiftedFrom,
    to: shiftedTo,

    rangeLabel: `${rangeFormatter.format(
      shiftedFrom,
    )}–${rangeFormatter.format(
      shiftedInclusiveTo,
    )}`,
  };
}
function getActivityBucketSql(
  column:
    | typeof respondents.createdAt
    | typeof assessmentSessions.createdAt
    | typeof assessmentResultSnapshots.createdAt,
  aggregation: ActivityAggregation,
) {
  switch (aggregation) {
    case "week":
      return sql<string>`
        to_char(
          date_trunc(
            'week',
            timezone(${ACTIVITY_TIME_ZONE}, ${column})
          ),
          'YYYY-MM-DD'
        )
      `;

    case "month":
      return sql<string>`
        to_char(
          date_trunc(
            'month',
            timezone(${ACTIVITY_TIME_ZONE}, ${column})
          ),
          'YYYY-MM-DD'
        )
      `;

    case "quarter":
      return sql<string>`
        to_char(
          date_trunc(
            'quarter',
            timezone(${ACTIVITY_TIME_ZONE}, ${column})
          ),
          'YYYY-MM-DD'
        )
      `;

    case "day":
    default:
      return sql<string>`
        to_char(
          date_trunc(
            'day',
            timezone(${ACTIVITY_TIME_ZONE}, ${column})
          ),
          'YYYY-MM-DD'
        )
      `;
  }
}

function activityBucketKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatActivityBucketLabel(
  date: Date,
  aggregation: ActivityAggregation,
) {
  switch (aggregation) {
    case "week": {
      const end = addActivityBuckets(date, "day", 6);

      const shortFormatter = new Intl.DateTimeFormat("pl-PL", {
        timeZone: ACTIVITY_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
      });

      return `${shortFormatter.format(date)}–${shortFormatter.format(end)}`;
    }

    case "month":
      return new Intl.DateTimeFormat("pl-PL", {
        timeZone: ACTIVITY_TIME_ZONE,
        month: "short",
        year: "numeric",
      }).format(date);

    case "quarter":
      return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;

    case "day":
    default:
      return new Intl.DateTimeFormat("pl-PL", {
        timeZone: ACTIVITY_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
      }).format(date);
  }
}

function buildDashboardActivityTimeline({
  range,
  respondentsRows,
  sessionsRows,
  snapshotsRows,
}: {
  range: ActivityRange;
  respondentsRows: Array<{ date: string; value: unknown }>;
  sessionsRows: Array<{ date: string; value: unknown }>;
  snapshotsRows: Array<{ date: string; value: unknown }>;
}): TenantActivityPoint[] {
  const respondentsByDate = new Map(
    respondentsRows.map((row) => [
      row.date,
      numberValue(row.value),
    ]),
  );

  const sessionsByDate = new Map(
    sessionsRows.map((row) => [
      row.date,
      numberValue(row.value),
    ]),
  );

  const snapshotsByDate = new Map(
    snapshotsRows.map((row) => [
      row.date,
      numberValue(row.value),
    ]),
  );

const points: TenantActivityPoint[] = [];

let bucketDate = startOfActivityBucket(
  range.from,
  range.aggregation,
);

while (bucketDate < range.to) {
  const date = activityBucketKey(bucketDate);

  points.push({
    date,
    label: formatActivityBucketLabel(
      bucketDate,
      range.aggregation,
    ),
    respondents: respondentsByDate.get(date) ?? 0,
    sessions: sessionsByDate.get(date) ?? 0,
    snapshots: snapshotsByDate.get(date) ?? 0,
  });

  bucketDate = addActivityBuckets(
    bucketDate,
    range.aggregation,
    1,
  );
}

return points;
}



async function getTenantDashboardData({
  tenantSlug,
  activityAggregation,
  activityOffset,
  activityFrom,
  activityTo,
}: {
  tenantSlug: string;
  activityAggregation: ActivityAggregation;
  activityOffset: number;
  activityFrom: Date | null;
  activityTo: Date | null;
}) {
  const ctx = await requireTenantContext({ tenantSlug });
  const db = await getTenantDb(ctx);

  const activityRange = createActivityRange({
    aggregation: activityAggregation,
    offset: activityOffset,
    requestedFrom: activityFrom,
    requestedTo: activityTo,
  });

  const respondentBucketSql = getActivityBucketSql(
    respondents.createdAt,
    activityAggregation,
  );

  const sessionBucketSql = getActivityBucketSql(
    assessmentSessions.createdAt,
    activityAggregation,
  );

  const snapshotBucketSql = getActivityBucketSql(
    assessmentResultSnapshots.createdAt,
    activityAggregation,
  );

  const [
    projectCountRows,
    respondentCountRows,
    sessionCountRows,
    snapshotCountRows,
    sessionStatusRows,
    recentProjects,
    recentSessions,
    accessCodeStatusRows,
    orderStatusRows,
    recentOrders,
    respondentActivityRows,
    sessionActivityRows,
    snapshotActivityRows,
  ] = await Promise.all([
    db
      .select({
        value: count(assessmentProjects.id),
      })
      .from(assessmentProjects)
      .where(isNull(assessmentProjects.deletedAt)),

    db
      .select({
        value: count(respondents.id),
      })
      .from(respondents)
      .where(isNull(respondents.deletedAt)),

    db
      .select({
        value: count(assessmentSessions.id),
      })
      .from(assessmentSessions)
      .where(isNull(assessmentSessions.deletedAt)),

    db
      .select({
        value: count(assessmentResultSnapshots.id),
      })
      .from(assessmentResultSnapshots)
      .where(isNull(assessmentResultSnapshots.deletedAt)),

    db
      .select({
        status: assessmentSessions.status,
        value: count(assessmentSessions.id),
      })
      .from(assessmentSessions)
      .where(isNull(assessmentSessions.deletedAt))
      .groupBy(assessmentSessions.status),

    db
      .select({
        id: assessmentProjects.id,
        name: assessmentProjects.name,
        description: assessmentProjects.description,
        status: assessmentProjects.status,
        createdAt: assessmentProjects.createdAt,
        updatedAt: assessmentProjects.updatedAt,
      })
      .from(assessmentProjects)
      .where(isNull(assessmentProjects.deletedAt))
      .orderBy(desc(assessmentProjects.updatedAt))
      .limit(5),

    db
      .select({
        id: assessmentSessions.id,
        status: assessmentSessions.status,
        assessmentProjectId: assessmentSessions.assessmentProjectId,
        completedAt: assessmentSessions.completedAt,
        updatedAt: assessmentSessions.updatedAt,
      })
      .from(assessmentSessions)
      .where(isNull(assessmentSessions.deletedAt))
      .orderBy(desc(assessmentSessions.updatedAt))
      .limit(8),

    controlDb
      .select({
        status: reportAccessCodes.status,
        value: count(reportAccessCodes.id),
      })
      .from(reportAccessCodes)
      .where(
        and(
          eq(reportAccessCodes.tenantSlug, tenantSlug),
          isNull(reportAccessCodes.deletedAt),
        ),
      )
      .groupBy(reportAccessCodes.status),

    controlDb
      .select({
        status: reportAccessOrders.status,
        value: count(reportAccessOrders.id),
      })
      .from(reportAccessOrders)
      .where(
        and(
          eq(reportAccessOrders.tenantSlug, tenantSlug),
          isNull(reportAccessOrders.deletedAt),
        ),
      )
      .groupBy(reportAccessOrders.status),

    controlDb
      .select({
        id: reportAccessOrders.id,
        status: reportAccessOrders.status,
        currency: reportAccessOrders.currency,
        totalGross: reportAccessOrders.totalGross,
        paymentProvider: reportAccessOrders.paymentProvider,
        paidAt: reportAccessOrders.paidAt,
        createdAt: reportAccessOrders.createdAt,
      })
      .from(reportAccessOrders)
      .where(
        and(
          eq(reportAccessOrders.tenantSlug, tenantSlug),
          isNull(reportAccessOrders.deletedAt),
        ),
      )
      .orderBy(desc(reportAccessOrders.createdAt))
      .limit(5),

    db
      .select({
        date: respondentBucketSql,
        value: count(respondents.id),
      })
      .from(respondents)
      .where(
        and(
          isNull(respondents.deletedAt),
          gte(respondents.createdAt, activityRange.from),
          lt(respondents.createdAt, activityRange.to),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({
        date: sessionBucketSql,
        value: count(assessmentSessions.id),
      })
      .from(assessmentSessions)
      .where(
        and(
          isNull(assessmentSessions.deletedAt),
          gte(assessmentSessions.createdAt, activityRange.from),
          lt(assessmentSessions.createdAt, activityRange.to),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({
        date: snapshotBucketSql,
        value: count(assessmentResultSnapshots.id),
      })
      .from(assessmentResultSnapshots)
      .where(
        and(
          isNull(assessmentResultSnapshots.deletedAt),
          gte(
            assessmentResultSnapshots.createdAt,
            activityRange.from,
          ),
          lt(
            assessmentResultSnapshots.createdAt,
            activityRange.to,
          ),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`),
  ]);

  const sessionStatus = {
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const row of sessionStatusRows) {
    const value = numberValue(row.value);

    if (row.status === "not_started") {
      sessionStatus.notStarted += value;
    }

    if (row.status === "in_progress") {
      sessionStatus.inProgress += value;
    }

    if (row.status === "completed") {
      sessionStatus.completed += value;
    }

    if (row.status === "cancelled") {
      sessionStatus.cancelled += value;
    }
  }

  const accessCodes = {
    available: 0,
    assigned: 0,
    redeemed: 0,
    expired: 0,
    cancelled: 0,
    total: 0,
  };

  for (const row of accessCodeStatusRows) {
    const value = numberValue(row.value);

    accessCodes.total += value;

    if (row.status === "available") {
      accessCodes.available += value;
    }

    if (row.status === "assigned") {
      accessCodes.assigned += value;
    }

    if (row.status === "redeemed") {
      accessCodes.redeemed += value;
    }

    if (row.status === "expired") {
      accessCodes.expired += value;
    }

    if (row.status === "cancelled") {
      accessCodes.cancelled += value;
    }
  }

  const orders = {
    draft: 0,
    pendingPayment: 0,
    paid: 0,
    failed: 0,
    cancelled: 0,
    refunded: 0,
    total: 0,
  };

  for (const row of orderStatusRows) {
    const value = numberValue(row.value);

    orders.total += value;

    if (row.status === "draft") {
      orders.draft += value;
    }

    if (row.status === "pending_payment") {
      orders.pendingPayment += value;
    }

    if (row.status === "paid") {
      orders.paid += value;
    }

    if (row.status === "failed") {
      orders.failed += value;
    }

    if (row.status === "cancelled") {
      orders.cancelled += value;
    }

    if (row.status === "refunded") {
      orders.refunded += value;
    }
  }

  const activityTimeline = buildDashboardActivityTimeline({
    range: activityRange,
    respondentsRows: respondentActivityRows,
    sessionsRows: sessionActivityRows,
    snapshotsRows: snapshotActivityRows,
  });

  return {
    ctx,
    activityTimeline,
    activityView: {
      aggregation: activityRange.aggregation,
      offset: activityRange.offset,

      // Bazowy zakres wybrany w polach dat.
      from: formatActivityInputDate(activityRange.baseFrom),
      to: formatActivityInputDate(
        activityRange.baseInclusiveTo,
      ),

      // Opis faktycznego zakresu po uwzględnieniu offsetu.
      rangeLabel: activityRange.rangeLabel,
    },
    counts: {
      projects: numberValue(projectCountRows[0]?.value),
      respondents: numberValue(respondentCountRows[0]?.value),
      sessions: numberValue(sessionCountRows[0]?.value),
      snapshots: numberValue(snapshotCountRows[0]?.value),
    },
    sessionStatus,
    accessCodes,
    orders,
    recentProjects,
    recentSessions,
    recentOrders,
  };
}

function BrandButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Button
      asChild
      variant={variant === "primary" ? "default" : "outline"}
      className={
        variant === "primary"
          ? "rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          : "rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      }
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function DashboardCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-[2rem] border border-black/10 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
            {title}
          </h2>

          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
  progress,
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: ReactNode;
  progress?: number;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
            {label}
          </p>

          <div className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#171717]">
            {value}
          </div>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{helper}</p>

      {typeof progress === "number" ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-[#6b7280]">Udział</span>
            <span className="font-semibold text-[#171717]">{progress}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MiniMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
        {label}
      </p>

      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
        {value}
      </div>

      {helper ? (
        <p className="mt-1 text-xs leading-5 text-[#6b7280]">{helper}</p>
      ) : null}
    </div>
  );
}

function StatusPill({
  status,
  children,
}: {
  status: string | null;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
        status,
      )}`}
    >
      {children}
    </span>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280]">
      {children}
    </div>
  );
}

export default async function TenantDashboardPage({
  params,
  searchParams,
}: TenantDashboardPageProps) {
  const [{ tenantSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const activityAggregation = parseActivityAggregation(
    resolvedSearchParams.activityAggregation,
  );

  const activityOffset = parseActivityOffset(
    resolvedSearchParams.activityOffset,
  );

  const activityFrom = parseActivityDate(
  resolvedSearchParams.activityFrom,
);

const activityTo = parseActivityDate(
  resolvedSearchParams.activityTo,
);

const data = await getTenantDashboardData({
  tenantSlug,
  activityAggregation,
  activityOffset,
  activityFrom,
  activityTo,
});
  const ctx = data.ctx;

  const completionRate =
    data.counts.sessions > 0
      ? Math.round((data.sessionStatus.completed / data.counts.sessions) * 100)
      : 0;

  const accessUseRate = percent(
    data.accessCodes.redeemed,
    data.accessCodes.total,
  );

  const paidOrderRate = percent(data.orders.paid, data.orders.total);

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title={ctx.tenantName}
          description="Operacyjny dashboard badań, respondentów, sesji i dostępów raportowych."
          actions={
            <div className="flex flex-wrap gap-2">
              <BrandButton
                href={`/t/${ctx.tenantSlug}/assessment-projects`}
                variant="secondary"
              >
                Projekty badawcze
              </BrandButton>

              <BrandButton
                href={`/t/${ctx.tenantSlug}/report-access`}
                variant="secondary"
              >
                Dostępy raportowe
              </BrandButton>

              <BrandButton href={`/t/${ctx.tenantSlug}/members`} variant="secondary">
                Zespół
              </BrandButton>
            </div>
          }
        />



        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Projekty"
            value={data.counts.projects}
            helper="Aktywne i historyczne projekty badawcze."
            icon={<ClipboardList size={20} />}
          />

          <StatCard
            label="Respondenci"
            value={data.counts.respondents}
            helper="Osoby zarejestrowane w badaniach partnera."
            icon={<Users size={20} />}
          />

          <StatCard
            label="Sesje"
            value={data.counts.sessions}
            helper="Wszystkie rozpoczęte i zakończone kwestionariusze."
            icon={<BarChart3 size={20} />}
            progress={completionRate}
          />

          <StatCard
            label="Snapshoty"
            value={data.counts.snapshots}
            helper="Zamrożone wyniki gotowe do raportowania."
            icon={<PackageCheck size={20} />}
          />
        </section>
        <DashboardCard>
          <SectionHeader
            icon={<Activity size={20} />}
            title="Aktywność w czasie"
            description="Liczba nowych respondentów, utworzonych sesji i zapisanych wyników w wybranym oknie czasowym."
          />

          <div className="px-5 pb-5 md:px-6 md:pb-6">
<TenantActivityLineChart
  data={data.activityTimeline}
  aggregation={data.activityView.aggregation}
  offset={data.activityView.offset}
  from={data.activityView.from}
  to={data.activityView.to}
  rangeLabel={data.activityView.rangeLabel}
/>
          </div>
        </DashboardCard>
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <DashboardCard>
            <SectionHeader
              icon={<BarChart3 size={20} />}
              title="Status sesji badawczych"
              description="Szybki podgląd tego, ile sesji jest w toku, ile zostało zakończonych i ile nadal czeka na start."
            />

            <div className="grid gap-3 px-5 pb-5 md:grid-cols-4 md:px-6 md:pb-6">
              <MiniMetric
                label="W trakcie"
                value={data.sessionStatus.inProgress}
              />

              <MiniMetric
                label="Zakończone"
                value={data.sessionStatus.completed}
              />

              <MiniMetric
                label="Nierozpoczęte"
                value={data.sessionStatus.notStarted}
              />

              <MiniMetric label="Anulowane" value={data.sessionStatus.cancelled} />
            </div>
          </DashboardCard>

          <DashboardCard>
            <SectionHeader
              icon={<KeyRound size={20} />}
              title="Dostępy raportowe"
              description="Pula kodów i dostępów używanych do odblokowywania raportów."
              action={
                <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  {accessUseRate}% wykorzystania
                </Badge>
              }
            />

            <div className="space-y-4 px-5 pb-5 md:px-6 md:pb-6">
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric label="Wolne" value={data.accessCodes.available} />
                <MiniMetric label="Zużyte" value={data.accessCodes.redeemed} />
                <MiniMetric label="Przypisane" value={data.accessCodes.assigned} />
                <MiniMetric label="Łącznie" value={data.accessCodes.total} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#6b7280]">Zużycie puli</span>
                  <span className="font-semibold text-[#171717]">
                    {accessUseRate}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]"
                    style={{ width: `${Math.max(0, Math.min(100, accessUseRate))}%` }}
                  />
                </div>
              </div>

              <BrandButton href={`/t/${ctx.tenantSlug}/report-access`}>
                Zarządzaj dostępami
                <ArrowRight size={16} />
              </BrandButton>
            </div>
          </DashboardCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <DashboardCard>
            <SectionHeader
              icon={<FileText size={20} />}
              title="Ostatnie projekty"
              description="Najświeżej aktualizowane projekty badawcze partnera."
              action={
                <BrandButton
                  href={`/t/${ctx.tenantSlug}/assessment-projects`}
                  variant="secondary"
                >
                  Wszystkie
                </BrandButton>
              }
            />

            <div className="px-5 pb-5 md:px-6 md:pb-6">
              {data.recentProjects.length === 0 ? (
                <EmptyPanel>Brak projektów badawczych.</EmptyPanel>
              ) : (
                <div className="space-y-3">
                  {data.recentProjects.map((project) => (
                    <article
                      key={project.id}
                      className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm transition hover:border-black/20 hover:bg-white"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
                            {project.name}
                          </h3>

                          {project.description ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6b7280]">
                              {project.description}
                            </p>
                          ) : null}

                          <p className="mt-2 text-xs text-[#8b9099]">
                            Aktualizacja: {formatDateTime(project.updatedAt)}
                          </p>
                        </div>

                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                        >
                          <Link
                            href={`/dashboard/partner-assessment/${ctx.tenantSlug}/projects/${project.id}`}
                          >
                            Podgląd
                          </Link>
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </DashboardCard>

          <DashboardCard>
            <SectionHeader
              icon={<Activity size={20} />}
              title="Ostatnie sesje"
              description="Najnowsza aktywność respondentów w sesjach badawczych."
            />

            <div className="px-5 pb-5 md:px-6 md:pb-6">
              {data.recentSessions.length === 0 ? (
                <EmptyPanel>Brak sesji badawczych.</EmptyPanel>
              ) : (
                <div className="space-y-3">
                  {data.recentSessions.map((session) => (
                    <article
                      key={session.id}
                      className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs text-[#8b9099]">
                            {session.id}
                          </p>

                          <div className="mt-2">
                            <StatusPill status={session.status}>
                              {getSessionStatusLabel(session.status)}
                            </StatusPill>
                          </div>

                          <p className="mt-2 text-xs text-[#6b7280]">
                            Aktualizacja: {formatDateTime(session.updatedAt)}
                          </p>
                        </div>

                        {session.status === "completed" ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                          >
                            <Link
                              href={`/t/${ctx.tenantSlug}/assessment-sessions/${session.id}/results`}
                            >
                              Wynik
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </DashboardCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <DashboardCard>
            <SectionHeader
              icon={<ShoppingCart size={20} />}
              title="Zamówienia dostępów"
              description="Agregat statusów zamówień raportowych partnera."
              action={
                <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  {paidOrderRate}% opłaconych
                </Badge>
              }
            />

            <div className="grid grid-cols-2 gap-3 px-5 pb-5 md:px-6 md:pb-6">
              <MiniMetric label="Opłacone" value={data.orders.paid} />
              <MiniMetric
                label="Oczekujące"
                value={data.orders.pendingPayment}
              />
              <MiniMetric label="Anulowane" value={data.orders.cancelled} />
              <MiniMetric label="Łącznie" value={data.orders.total} />
            </div>
          </DashboardCard>

          <DashboardCard>
            <SectionHeader
              icon={<CreditCard size={20} />}
              title="Ostatnie zakupy"
              description="Najnowsze zamówienia dostępów raportowych."
              action={
                <BrandButton
                  href={`/t/${ctx.tenantSlug}/report-access`}
                  variant="secondary"
                >
                  Historia
                </BrandButton>
              }
            />

            <div className="px-5 pb-5 md:px-6 md:pb-6">
              {data.recentOrders.length === 0 ? (
                <EmptyPanel>Brak zamówień dostępów raportowych.</EmptyPanel>
              ) : (
                <div className="space-y-3">
                  {data.recentOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs text-[#8b9099]">
                            {order.id}
                          </p>

                          <div className="mt-2">
                            <StatusPill status={order.status}>
                              {getOrderStatusLabel(order.status)}
                            </StatusPill>
                          </div>

                          <p className="mt-2 text-xs text-[#6b7280]">
                            Utworzono: {formatDateTime(order.createdAt)}
                          </p>

                          {order.paidAt ? (
                            <p className="mt-1 text-xs text-[#6b7280]">
                              Opłacono: {formatDateTime(order.paidAt)}
                            </p>
                          ) : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="font-semibold text-[#171717]">
                            {formatMoney(
                              order.totalGross,
                              order.currency ?? "PLN",
                            )}
                          </div>

                          <div className="mt-1 text-xs text-[#6b7280]">
                            {order.paymentProvider ?? "—"}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </DashboardCard>
        </section>
      </div>
    </div>
  );
}