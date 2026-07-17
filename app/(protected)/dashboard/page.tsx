import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  FileText,
  Layers3,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { and, count, desc, eq, isNull } from "drizzle-orm";

import { listDashboardTenantActivity } from "@/features/dashboard/api/dashboard-tenant-activity.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  AdminTenantActivityLineChart,
} from "@/features/dashboard/components/admin-tenant-activity-line-chart";
import {
  getAdminDashboardActivity,
  parseAdminActivityAggregation,
  parseAdminActivityDate,
  parseAdminActivityMetric,
  parseAdminActivityOffset,
  parseAdminActivityTenants,
} from "@/features/dashboard/api/admin-dashboard-activity.queries";

type DashboardPageProps = {
  searchParams: Promise<{
    activityTenants?: string | string[];
    activityMetric?: string | string[];
    activityAggregation?: string | string[];
    activityOffset?: string | string[];
    activityFrom?: string | string[];
    activityTo?: string | string[];
  }>;
};


function formatDateTime(value: unknown) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusBadgeVariant(
  status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active" || status === "success") return "default";
  if (status === "draft" || status === "pending") return "secondary";
  if (status === "archived" || status === "failed") return "destructive";

  return "outline";
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
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

    controlDb.select({ value: count() }).from(users).where(isNull(users.deletedAt)),

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

    controlDb.select({ value: count() }).from(tenantDatabaseConnections),

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

function BrandButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
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
  children: React.ReactNode;
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
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
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
  value: number;
  helper: string;
  icon: React.ReactNode;
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
            <span className="font-medium text-[#6b7280]">Udział aktywnych</span>
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

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280]">
      {children}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  await requireSuperAdmin();

  const resolvedSearchParams = await searchParams;

  const activityAggregation = parseAdminActivityAggregation(
    resolvedSearchParams.activityAggregation,
  );
  const activityMetric = parseAdminActivityMetric(
    resolvedSearchParams.activityMetric,
  );
  const activityOffset = parseAdminActivityOffset(
    resolvedSearchParams.activityOffset,
  );
  const activityFrom = parseAdminActivityDate(
    resolvedSearchParams.activityFrom,
  );
  const activityTo = parseAdminActivityDate(
    resolvedSearchParams.activityTo,
  );
  const activityTenants = parseAdminActivityTenants(
    resolvedSearchParams.activityTenants,
  );

  const [data, tenantActivity, adminActivity] = await Promise.all([
    getDashboardData(),
    listDashboardTenantActivity(),
    getAdminDashboardActivity({
      selectedTenantSlugs: activityTenants,
      metric: activityMetric,
      aggregation: activityAggregation,
      offset: activityOffset,
      requestedFrom: activityFrom,
      requestedTo: activityTo,
    }),
  ]);

  const readyTenantActivityCount = tenantActivity.filter(
    (tenant) => tenant.ok,
  ).length;

  const totalProjects = tenantActivity.reduce(
    (sum, tenant) => sum + (tenant.ok ? tenant.projectsCount : 0),
    0,
  );

  const totalRespondents = tenantActivity.reduce(
    (sum, tenant) => sum + (tenant.ok ? tenant.respondentsCount : 0),
    0,
  );

  const totalSessions = tenantActivity.reduce(
    (sum, tenant) => sum + (tenant.ok ? tenant.sessionsCount : 0),
    0,
  );

  const totalCompletedSessions = tenantActivity.reduce(
    (sum, tenant) => sum + (tenant.ok ? tenant.completedSessionsCount : 0),
    0,
  );

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Dashboard"
          description="Panel kontrolny HUMANET VALUES: partnerzy, kwestionariusze, wersje publiczne i stan baz danych."
          actions={
            <div className="flex flex-wrap gap-2">
              <BrandButton href="/dashboard/questionnaires" variant="secondary">
                Kwestionariusze
              </BrandButton>

              <BrandButton href="/dashboard/tenants" variant="secondary">
                Partnerzy
              </BrandButton>

              <BrandButton href="/my/assessment">
                Moje badania
                <ArrowRight size={16} />
              </BrandButton>
            </div>
          }
        />


        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Partnerzy"
            value={data.tenants.total}
            helper={`Aktywne: ${data.tenants.active}`}
            icon={<Building2 size={20} />}
            progress={percent(data.tenants.active, data.tenants.total)}
          />

          <StatCard
            label="Użytkownicy"
            value={data.users.total}
            helper={`Aktywni: ${data.users.active}`}
            icon={<Users size={20} />}
            progress={percent(data.users.active, data.users.total)}
          />

          <StatCard
            label="Kwestionariusze"
            value={data.questionnaires.total}
            helper={`Aktywne: ${data.questionnaires.active}`}
            icon={<FileText size={20} />}
            progress={percent(data.questionnaires.active, data.questionnaires.total)}
          />

          <StatCard
            label="Wersje publiczne"
            value={data.questionnaireVersions.public}
            helper={`Aktywne wersje: ${data.questionnaireVersions.active} / ${data.questionnaireVersions.total}`}
            icon={<Layers3 size={20} />}
            progress={percent(
              data.questionnaireVersions.active,
              data.questionnaireVersions.total,
            )}
          />
        </section>
<DashboardCard>
  <SectionHeader
    icon={<Activity size={20} />}
    title="Aktywność platformy w czasie"
    description="Porównaj liczbę respondentów, sesji lub zapisanych wyników pomiędzy partnerami. Przy jednym partnerze widzisz jego trend, a przy wielu — osobną linię dla każdego partnera."
  />

  <div className="px-5 pb-5 md:px-6 md:pb-6">
    <AdminTenantActivityLineChart
      tenantOptions={adminActivity.tenantOptions}
      selectedTenantSlugs={adminActivity.selectedTenantSlugs}
      metric={adminActivity.metric}
      aggregation={adminActivity.aggregation}
      offset={adminActivity.offset}
      from={adminActivity.from}
      to={adminActivity.to}
      rangeLabel={adminActivity.rangeLabel}
      series={adminActivity.series}
      aggregate={adminActivity.aggregate}
      failures={adminActivity.failures}
    />
  </div>
</DashboardCard>
        <section className="grid gap-4 md:grid-cols-4">
          <DashboardCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
              Projekty
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#171717]">
              {totalProjects}
            </p>
            <p className="mt-1 text-sm text-[#6b7280]">u partnerów</p>
          </DashboardCard>

          <DashboardCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
              Respondenci
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#171717]">
              {totalRespondents}
            </p>
            <p className="mt-1 text-sm text-[#6b7280]">
              zagregowani z baz partnerów
            </p>
          </DashboardCard>

          <DashboardCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
              Sesje
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#171717]">
              {totalSessions}
            </p>
            <p className="mt-1 text-sm text-[#6b7280]">łącznie</p>
          </DashboardCard>

          <DashboardCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
              Ukończone
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#171717]">
              {totalCompletedSessions}
            </p>
            <p className="mt-1 text-sm text-[#6b7280]">zakończone sesje badań</p>
          </DashboardCard>
        </section>

        <DashboardCard>
          <SectionHeader
            icon={<Activity size={20} />}
            title="Aktywność partnerów"
            description="Lekkie agregaty z baz tenantowych: projekty, respondenci i sesje badań. Awaria jednej bazy nie powinna blokować całego dashboardu."
            action={
              <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                {readyTenantActivityCount} / {tenantActivity.length} baz gotowych
              </Badge>
            }
          />

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {tenantActivity.length === 0 ? (
              <EmptyPanel>Brak aktywnych partnerów.</EmptyPanel>
            ) : (
              <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Tenant</th>
                        <th className="px-4 py-3 font-semibold">Baza</th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Projekty
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Respondenci
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Sesje
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          W toku
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Zakończone
                        </th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {tenantActivity.map((tenant) => (
                        <tr
                          key={tenant.tenantId}
                          className="border-b border-black/10 last:border-0"
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-[#171717]">
                              {tenant.tenantName}
                            </div>
                            <div className="font-mono text-xs text-[#6b7280]">
                              {tenant.tenantSlug}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-mono text-xs text-[#171717]">
                              {tenant.databaseName ?? "—"}
                            </div>
                            <div className="text-xs text-[#6b7280]">
                              schema: {tenant.schemaVersion ?? "—"}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right text-[#171717]">
                            {tenant.ok ? tenant.projectsCount : "—"}
                          </td>

                          <td className="px-4 py-4 text-right text-[#171717]">
                            {tenant.ok ? tenant.respondentsCount : "—"}
                          </td>

                          <td className="px-4 py-4 text-right text-[#171717]">
                            {tenant.ok ? tenant.sessionsCount : "—"}
                          </td>

                          <td className="px-4 py-4 text-right text-[#171717]">
                            {tenant.ok ? tenant.inProgressSessionsCount : "—"}
                          </td>

                          <td className="px-4 py-4 text-right text-[#171717]">
                            {tenant.ok ? tenant.completedSessionsCount : "—"}
                          </td>

                          <td className="px-4 py-4">
                            {tenant.ok ? (
                              <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                                OK
                              </Badge>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant="destructive">
                                  {tenant.migrationStatus ?? "brak bazy"}
                                </Badge>
                                <div className="max-w-[260px] text-xs leading-5 text-[#6b7280]">
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
              </div>
            )}
          </div>
        </DashboardCard>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <DashboardCard>
            <SectionHeader
              icon={<FileText size={20} />}
              title="Ostatnio aktualizowane wersje"
              description="Najnowsze zmiany w wersjach kwestionariuszy."
              action={
                <BrandButton href="/dashboard/questionnaires" variant="secondary">
                  Zarządzaj
                </BrandButton>
              }
            />

            <div className="px-5 pb-5 md:px-6 md:pb-6">
              {data.recentQuestionnaireVersions.length === 0 ? (
                <EmptyPanel>Brak wersji kwestionariuszy.</EmptyPanel>
              ) : (
                <div className="space-y-3">
                  {data.recentQuestionnaireVersions.map((version) => (
                    <article
                      key={version.id}
                      className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm transition hover:border-black/20 hover:bg-white"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
                              {version.questionnaireName}
                            </h3>

                            <Badge variant="outline">
                              {version.questionnaireCode}
                            </Badge>

                            <Badge variant={statusBadgeVariant(version.status)}>
                              {version.status}
                            </Badge>

                            {version.isPublic ? (
                              <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                                publiczny
                              </Badge>
                            ) : null}
                          </div>

                          <p className="mt-1 text-sm text-[#6b7280]">
                            {version.name} · wersja {version.version}
                          </p>

                          <p className="mt-1 text-xs text-[#8b9099]">
                            Aktualizacja: {formatDateTime(version.updatedAt)}
                          </p>
                        </div>

                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-full border-black/10 bg-white/70"
                        >
                          <Link
                            href={`/dashboard/questionnaires/editor/${version.id}`}
                          >
                            Edytuj
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
              icon={<Database size={20} />}
              title="Stan baz partnerów"
              description={`Gotowe migracje: ${data.tenantDatabases.ready} / ${data.tenantDatabases.total}`}
            />

            <div className="px-5 pb-5 md:px-6 md:pb-6">
              {data.tenantDbConnections.length === 0 ? (
                <EmptyPanel>Brak skonfigurowanych baz partnerów.</EmptyPanel>
              ) : (
                <div className="space-y-3">
                  {data.tenantDbConnections.map((connection) => (
                    <article
                      key={`${connection.tenantId}:${connection.databaseName}`}
                      className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
                            {connection.tenantName}
                          </h3>
                          <p className="mt-0.5 text-xs text-[#6b7280]">
                            {connection.tenantSlug} · {connection.databaseName}
                          </p>
                        </div>

                        <Badge
                          variant={statusBadgeVariant(
                            connection.migrationStatus,
                          )}
                        >
                          {connection.migrationStatus}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-2 text-xs text-[#6b7280]">
                        <div>
                          Schema version:{" "}
                          <span className="font-mono text-[#171717]">
                            {connection.schemaVersion ?? "—"}
                          </span>
                        </div>

                        <div>
                          Ostatnia migracja:{" "}
                          {formatDateTime(connection.lastMigratedAt)}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </DashboardCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <DashboardCard>
            <SectionHeader
              icon={<Building2 size={20} />}
              title="Ostatnio aktualizowane tenanty"
            />

            <div className="px-5 pb-5 md:px-6 md:pb-6">
              {data.recentTenants.length === 0 ? (
                <EmptyPanel>Brak partnerów.</EmptyPanel>
              ) : (
                <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Partner</th>
                          <th className="px-4 py-3 font-semibold">Slug</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">
                            Aktualizacja
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {data.recentTenants.map((tenant) => (
                          <tr
                            key={tenant.id}
                            className="border-b border-black/10 last:border-0"
                          >
                            <td className="px-4 py-4 font-semibold text-[#171717]">
                              {tenant.name}
                            </td>
                            <td className="px-4 py-4 font-mono text-xs text-[#6b7280]">
                              {tenant.slug}
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant={statusBadgeVariant(tenant.status)}>
                                {tenant.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-[#6b7280]">
                              {formatDateTime(tenant.updatedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </DashboardCard>

          <DashboardCard>
            <SectionHeader
              icon={<Sparkles size={20} />}
              title="Najbliższy sensowny krok"
              description="Dashboard ma obraz control layer i lekkie agregaty tenantowe. Kolejnym krokiem powinno być przejście od obserwacji do kontroli operacyjnej."
            />

            <div className="px-5 pb-5 md:px-6 md:pb-6">
              <div className="space-y-4 text-sm leading-7 text-[#6b7280]">
                <p>
                  Warto dodać moduł health & activity summary z jasnym podziałem
                  na partnerów gotowych, wymagających migracji oraz partnerów z
                  błędem połączenia.
                </p>

                <p>
                  Najlepiej utrzymać defensywny try/catch per partner, żeby awaria
                  jednej bazy nie blokowała całego widoku administracyjnego.
                </p>

                <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-5">
                  <div className="font-semibold text-[#171717]">
                    Proponowany następny moduł
                  </div>
                  <div className="mt-1 text-[#0f766e]">
                    Cross-tenant health & activity summary dla projektów
                    badawczych.
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>
        </section>
      </div>
    </div>
  );
}