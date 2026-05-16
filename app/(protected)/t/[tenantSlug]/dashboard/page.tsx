import Link from "next/link";
import { and, count, desc, eq, isNull } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import {
  reportAccessCodes,
  reportAccessOrders,
} from "@/drizzle/schema";

type TenantDashboardPageProps = {
  params: Promise<{
    tenantSlug: string;
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
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (status === "in_progress" || status === "pending_payment") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (status === "cancelled" || status === "failed" || status === "refunded") {
    return "border-muted bg-muted text-muted-foreground";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
}

async function getTenantDashboardData(tenantSlug: string) {
  const ctx = await requireTenantContext({ tenantSlug });
  const db = await getTenantDb(ctx);

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
  ]);

  const sessionStatus = {
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const row of sessionStatusRows) {
    const value = numberValue(row.value);

    if (row.status === "not_started") sessionStatus.notStarted += value;
    if (row.status === "in_progress") sessionStatus.inProgress += value;
    if (row.status === "completed") sessionStatus.completed += value;
    if (row.status === "cancelled") sessionStatus.cancelled += value;
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

    if (row.status === "available") accessCodes.available += value;
    if (row.status === "assigned") accessCodes.assigned += value;
    if (row.status === "redeemed") accessCodes.redeemed += value;
    if (row.status === "expired") accessCodes.expired += value;
    if (row.status === "cancelled") accessCodes.cancelled += value;
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

    if (row.status === "draft") orders.draft += value;
    if (row.status === "pending_payment") orders.pendingPayment += value;
    if (row.status === "paid") orders.paid += value;
    if (row.status === "failed") orders.failed += value;
    if (row.status === "cancelled") orders.cancelled += value;
    if (row.status === "refunded") orders.refunded += value;
  }

  return {
    ctx,
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

export default async function TenantDashboardPage({
  params,
}: TenantDashboardPageProps) {
  const { tenantSlug } = await params;

  const data = await getTenantDashboardData(tenantSlug);
  const ctx = data.ctx;

  const completionRate =
    data.counts.sessions > 0
      ? Math.round((data.sessionStatus.completed / data.counts.sessions) * 100)
      : 0;

  return (
    <>
      <PageHeader
        title={`Tenant: ${ctx.tenantName}`}
        description="Operacyjny dashboard badań, respondentów, sesji i dostępów raportowych."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/t/${ctx.tenantSlug}/assessment-projects`}>
                Projekty badawcze
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/t/${ctx.tenantSlug}/report-access`}>
                Dostępy raportowe
              </Link>
            </Button>
          </div>
        }
      />

      <main className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projekty badawcze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {data.counts.projects}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktywne i historyczne projekty tenanta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Respondenci
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {data.counts.respondents}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Osoby zarejestrowane w badaniach tenanta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sesje badawcze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {data.counts.sessions}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Wszystkie rozpoczęte i zakończone wypełnienia.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ukończenie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{completionRate}%</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Udział sesji zakończonych wśród wszystkich sesji.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Status sesji badawczych</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase text-muted-foreground">
                    W trakcie
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.sessionStatus.inProgress}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase text-muted-foreground">
                    Zakończone
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.sessionStatus.completed}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase text-muted-foreground">
                    Nierozpoczęte
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.sessionStatus.notStarted}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase text-muted-foreground">
                    Snapshoty
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.counts.snapshots}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dostępy raportowe</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Wolne</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.accessCodes.available}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Zużyte</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.accessCodes.redeemed}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Przypisane</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.accessCodes.assigned}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Łącznie</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.accessCodes.total}
                  </div>
                </div>
              </div>

              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={`/t/${ctx.tenantSlug}/report-access`}>
                  Zarządzaj dostępami i zakupami
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Ostatnie projekty</CardTitle>

              <Button asChild size="sm" variant="outline">
                <Link href={`/t/${ctx.tenantSlug}/assessment-projects`}>
                  Wszystkie
                </Link>
              </Button>
            </CardHeader>

            <CardContent>
              {data.recentProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Brak projektów badawczych.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-xl border bg-muted/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">{project.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Aktualizacja: {formatDateTime(project.updatedAt)}
                          </div>
                        </div>

                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/dashboard/partner-assessment/${ctx.tenantSlug}/projects/${project.id}`}
                          >
                            Podgląd
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ostatnie sesje</CardTitle>
            </CardHeader>

            <CardContent>
              {data.recentSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Brak sesji badawczych.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 p-4"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-muted-foreground">
                          {session.id}
                        </div>

                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                              session.status,
                            )}`}
                          >
                            {getSessionStatusLabel(session.status)}
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                          Aktualizacja: {formatDateTime(session.updatedAt)}
                        </div>
                      </div>

                      {session.status === "completed" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/t/${ctx.tenantSlug}/assessment-sessions/${session.id}/results`}
                          >
                            Wynik
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Zamówienia dostępów</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Opłacone</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.orders.paid}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">
                    Oczekujące
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.orders.pendingPayment}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Anulowane</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.orders.cancelled}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Łącznie</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.orders.total}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Ostatnie zakupy</CardTitle>

              <Button asChild size="sm" variant="outline">
                <Link href={`/t/${ctx.tenantSlug}/report-access`}>
                  Historia
                </Link>
              </Button>
            </CardHeader>

            <CardContent>
              {data.recentOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Brak zamówień dostępów raportowych.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border bg-muted/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {order.id}
                          </div>

                          <div className="mt-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                                order.status,
                              )}`}
                            >
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground">
                            {formatDateTime(order.createdAt)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold">
                            {formatMoney(order.totalGross, order.currency)}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            {order.paymentProvider ?? "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}