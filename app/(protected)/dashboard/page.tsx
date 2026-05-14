
import { listDashboardTenantActivity } from "@/features/dashboard/api/dashboard-tenant-activity.queries";
import Link from "next/link";
import { and, count, desc, eq, isNull } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  questionnaireVersions,
  questionnaires,
  tenantDatabaseConnections,
  tenants,
  users,
} from "@/drizzle/schema";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";
import { PageHeader } from "@/shared/ui";

function formatDateTime(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusBadgeVariant(status: string) {
  if (status === "active" || status === "success") return "default";
  if (status === "draft" || status === "pending") return "secondary";
  if (status === "archived" || status === "failed") return "destructive";

  return "outline";
}

async function getDashboardData() {
  const [
    tenantCountRows,
    activeTenantCountRows,
    userCountRows,
    activeUserCountRows,
    questionnaireCountRows,
    activeQuestionnaireCountRows,
    versionCountRows,
    activeVersionCountRows,
    publicVersionCountRows,
    dbConnectionCountRows,
    readyDbConnectionCountRows,
    recentTenants,
    recentQuestionnaireVersions,
    tenantDbConnections,
  ] = await Promise.all([
    controlDb
      .select({ value: count() })
      .from(tenants)
      .where(isNull(tenants.deletedAt)),

    controlDb
      .select({ value: count() })
      .from(tenants)
      .where(and(eq(tenants.status, "active"), isNull(tenants.deletedAt))),

    controlDb
      .select({ value: count() })
      .from(users)
      .where(isNull(users.deletedAt)),

    controlDb
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.status, "active"), isNull(users.deletedAt))),

    controlDb
      .select({ value: count() })
      .from(questionnaires)
      .where(isNull(questionnaires.deletedAt)),

    controlDb
      .select({ value: count() })
      .from(questionnaires)
      .where(
        and(eq(questionnaires.status, "active"), isNull(questionnaires.deletedAt)),
      ),

    controlDb
      .select({ value: count() })
      .from(questionnaireVersions)
      .where(isNull(questionnaireVersions.deletedAt)),

    controlDb
      .select({ value: count() })
      .from(questionnaireVersions)
      .where(
        and(
          eq(questionnaireVersions.status, "active"),
          isNull(questionnaireVersions.deletedAt),
        ),
      ),

    controlDb
      .select({ value: count() })
      .from(questionnaireVersions)
      .where(
        and(
          eq(questionnaireVersions.isPublic, true),
          isNull(questionnaireVersions.deletedAt),
        ),
      ),

    controlDb
      .select({ value: count() })
      .from(tenantDatabaseConnections),

    controlDb
      .select({ value: count() })
      .from(tenantDatabaseConnections)
      .where(eq(tenantDatabaseConnections.migrationStatus, "success")),

    controlDb
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        status: tenants.status,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      })
      .from(tenants)
      .where(isNull(tenants.deletedAt))
      .orderBy(desc(tenants.updatedAt))
      .limit(6),

    controlDb
      .select({
        id: questionnaireVersions.id,
        questionnaireId: questionnaireVersions.questionnaireId,
        version: questionnaireVersions.version,
        name: questionnaireVersions.name,
        status: questionnaireVersions.status,
        isPublic: questionnaireVersions.isPublic,
        updatedAt: questionnaireVersions.updatedAt,
        questionnaireName: questionnaires.name,
        questionnaireCode: questionnaires.code,
      })
      .from(questionnaireVersions)
      .innerJoin(
        questionnaires,
        eq(questionnaires.id, questionnaireVersions.questionnaireId),
      )
      .where(
        and(
          isNull(questionnaireVersions.deletedAt),
          isNull(questionnaires.deletedAt),
        ),
      )
      .orderBy(desc(questionnaireVersions.updatedAt))
      .limit(6),

    controlDb
      .select({
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        databaseName: tenantDatabaseConnections.databaseName,
        migrationStatus: tenantDatabaseConnections.migrationStatus,
        schemaVersion: tenantDatabaseConnections.schemaVersion,
        lastMigratedAt: tenantDatabaseConnections.lastMigratedAt,
        updatedAt: tenantDatabaseConnections.updatedAt,
      })
      .from(tenantDatabaseConnections)
      .innerJoin(tenants, eq(tenants.id, tenantDatabaseConnections.tenantId))
      .where(isNull(tenants.deletedAt))
      .orderBy(desc(tenantDatabaseConnections.updatedAt))
      .limit(8),
  ]);

  return {
    tenants: {
      total: Number(tenantCountRows[0]?.value ?? 0),
      active: Number(activeTenantCountRows[0]?.value ?? 0),
    },
    users: {
      total: Number(userCountRows[0]?.value ?? 0),
      active: Number(activeUserCountRows[0]?.value ?? 0),
    },
    questionnaires: {
      total: Number(questionnaireCountRows[0]?.value ?? 0),
      active: Number(activeQuestionnaireCountRows[0]?.value ?? 0),
    },
    questionnaireVersions: {
      total: Number(versionCountRows[0]?.value ?? 0),
      active: Number(activeVersionCountRows[0]?.value ?? 0),
      public: Number(publicVersionCountRows[0]?.value ?? 0),
    },
    tenantDatabases: {
      total: Number(dbConnectionCountRows[0]?.value ?? 0),
      ready: Number(readyDbConnectionCountRows[0]?.value ?? 0),
    },
    recentTenants,
    recentQuestionnaireVersions,
    tenantDbConnections,
  };
}

export default async function DashboardPage() {
  await requireSuperAdmin();

  const [data, tenantActivity] = await Promise.all([
  getDashboardData(),
  listDashboardTenantActivity(),
]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Panel kontrolny HUMANET VALUES: tenanty, kwestionariusze, wersje publiczne i stan baz danych."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/questionnaires">Kwestionariusze</Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/dashboard/tenants">Tenanty</Link>
            </Button>

            <Button asChild>
              <Link href="/my/assessment">Moje badania</Link>
            </Button>
          </div>
        }
      />

      <main className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tenanty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{data.tenants.total}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktywne: {data.tenants.active}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Użytkownicy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{data.users.total}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktywni: {data.users.active}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kwestionariusze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {data.questionnaires.total}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktywne: {data.questionnaires.active}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wersje publiczne
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {data.questionnaireVersions.public}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktywne wersje: {data.questionnaireVersions.active} /{" "}
                {data.questionnaireVersions.total}
              </p>
            </CardContent>
          </Card>
        </section>
<section>
  <Card>
    <CardHeader>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Aktywność tenantów</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Lekkie agregaty z baz tenantowych: projekty, respondenci i sesje badań.
          </p>
        </div>

        <Badge variant="outline">
          {tenantActivity.filter((tenant) => tenant.ok).length} /{" "}
          {tenantActivity.length} baz gotowych
        </Badge>
      </div>
    </CardHeader>

    <CardContent>
      {tenantActivity.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          Brak aktywnych tenantów.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-medium">Tenant</th>
                <th className="px-3 py-3 font-medium">Baza</th>
                <th className="px-3 py-3 text-right font-medium">Projekty</th>
                <th className="px-3 py-3 text-right font-medium">Respondenci</th>
                <th className="px-3 py-3 text-right font-medium">Sesje</th>
                <th className="px-3 py-3 text-right font-medium">W toku</th>
                <th className="px-3 py-3 text-right font-medium">Zakończone</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {tenantActivity.map((tenant) => (
                <tr key={tenant.tenantId} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <div className="font-medium">{tenant.tenantName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {tenant.tenantSlug}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="font-mono text-xs">
                      {tenant.databaseName ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      schema: {tenant.schemaVersion ?? "—"}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-right">
                    {tenant.ok ? tenant.projectsCount : "—"}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {tenant.ok ? tenant.respondentsCount : "—"}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {tenant.ok ? tenant.sessionsCount : "—"}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {tenant.ok ? tenant.inProgressSessionsCount : "—"}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {tenant.ok ? tenant.completedSessionsCount : "—"}
                  </td>

                  <td className="px-3 py-3">
                    {tenant.ok ? (
                      <Badge variant="default">OK</Badge>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="destructive">
                          {tenant.migrationStatus ?? "brak bazy"}
                        </Badge>
                        <div className="max-w-[260px] text-xs text-muted-foreground">
                          {tenant.errorMessage}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
</section>
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Ostatnio aktualizowane wersje</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Najnowsze zmiany w wersjach kwestionariuszy.
                  </p>
                </div>

                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/questionnaires">Zarządzaj</Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {data.recentQuestionnaireVersions.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Brak wersji kwestionariuszy.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentQuestionnaireVersions.map((version) => (
                    <div
                      key={version.id}
                      className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">
                            {version.questionnaireName}
                          </div>

                          <Badge variant="outline">
                            {version.questionnaireCode}
                          </Badge>

                          <Badge variant={statusBadgeVariant(version.status)}>
                            {version.status}
                          </Badge>

                          {version.isPublic ? (
                            <Badge variant="secondary">publiczny</Badge>
                          ) : null}
                        </div>

                        <div className="mt-1 text-sm text-muted-foreground">
                          {version.name} · wersja {version.version}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          Aktualizacja: {formatDateTime(version.updatedAt)}
                        </div>
                      </div>

                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/dashboard/questionnaires/editor/${version.id}`}
                        >
                          Edytuj
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stan baz tenantów</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Gotowe migracje: {data.tenantDatabases.ready} /{" "}
                {data.tenantDatabases.total}
              </p>
            </CardHeader>

            <CardContent>
              {data.tenantDbConnections.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Brak skonfigurowanych baz tenantów.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.tenantDbConnections.map((connection) => (
                    <div
                      key={`${connection.tenantId}:${connection.databaseName}`}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">
                            {connection.tenantName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {connection.tenantSlug} · {connection.databaseName}
                          </div>
                        </div>

                        <Badge
                          variant={statusBadgeVariant(
                            connection.migrationStatus,
                          )}
                        >
                          {connection.migrationStatus}
                        </Badge>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div>
                          Schema version:{" "}
                          <span className="font-mono">
                            {connection.schemaVersion ?? "—"}
                          </span>
                        </div>

                        <div>
                          Ostatnia migracja:{" "}
                          {formatDateTime(connection.lastMigratedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ostatnio aktualizowane tenanty</CardTitle>
            </CardHeader>

            <CardContent>
              {data.recentTenants.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Brak tenantów.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-3 font-medium">Tenant</th>
                        <th className="px-3 py-3 font-medium">Slug</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Aktualizacja</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.recentTenants.map((tenant) => (
                        <tr key={tenant.id} className="border-b last:border-0">
                          <td className="px-3 py-3 font-medium">
                            {tenant.name}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {tenant.slug}
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={statusBadgeVariant(tenant.status)}>
                              {tenant.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {formatDateTime(tenant.updatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Najbliższy sensowny krok</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Dashboard pokazuje teraz stan control layer. Kolejnym logicznym
                krokiem jest dodanie lekkich agregatów tenantowych: liczby
                projektów, respondentów, sesji zakończonych i sesji w toku.
              </p>

              <p>
                Najlepiej zrobić to jako osobną funkcję serwerową z defensywnym
                try/catch per tenant, żeby awaria jednej bazy nie blokowała
                całego dashboardu.
              </p>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="font-medium text-foreground">
                  Proponowany następny moduł:
                </div>
                <div className="mt-1">
                  cross-tenant health & activity summary dla projektów
                  badawczych.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}