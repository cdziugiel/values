// features/tenants/components/tenant-migrations-page.tsx

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Layers3,
  RefreshCcw,
  ServerCog,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { PageHeader } from "@/shared/ui";

import { listTenantMigrationStatuses } from "../api/tenant-migration.queries";
import {
  MigrateAllTenantsButton,
  MigrateTenantButton,
  ReprovisionTenantDatabaseButton,
} from "./tenant-migration-actions";

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getTenantStatusLabel(status: string | null) {
  switch (status) {
    case "active":
      return "Aktywny";
    case "inactive":
      return "Nieaktywny";
    case "suspended":
      return "Wstrzymany";
    case "archived":
      return "Zarchiwizowany";
    default:
      return status ?? "Nieznany";
  }
}

function getMigrationLabel(status: string | null) {
  switch (status) {
    case "success":
      return "Gotowa";
    case "failed":
      return "Błąd";
    case "running":
      return "W toku";
    case "pending":
      return "Oczekuje";
    default:
      return status ?? "Brak";
  }
}

function getTenantStatusBadgeClassName(status: string | null) {
  if (status === "active") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "suspended" || status === "archived") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

function getMigrationBadgeClassName(status: string | null) {
  if (status === "success") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "running") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

function getMigrationIcon(status: string | null) {
  if (status === "success") {
    return <CheckCircle2 size={14} />;
  }

  if (status === "failed") {
    return <TriangleAlert size={14} />;
  }

  if (status === "running") {
    return <RefreshCcw size={14} />;
  }

  return <Database size={14} />;
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
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

function MetricCard({
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

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

export async function TenantMigrationsPage() {
  await requireSuperAdmin();

  const tenants = await listTenantMigrationStatuses();

  const activeTenants = tenants.filter(
    (tenant) => tenant.tenantStatus === "active",
  );

  const readyDatabases = tenants.filter(
    (tenant) => tenant.migrationStatus === "success",
  );

  const failedDatabases = tenants.filter(
    (tenant) => tenant.migrationStatus === "failed",
  );

  const missingOrPendingDatabases = tenants.filter(
    (tenant) =>
      !tenant.migrationStatus ||
      tenant.migrationStatus === "pending" ||
      tenant.migrationStatus === "missing",
  );

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Migracje baz partnerów"
          description="Uruchamianie przygotowanych migracji Drizzle na pojedynczych lub wszystkich aktywnych bazach partnerów."
          actions={
            <div className="flex flex-wrap gap-2">
              <BrandButton href="/dashboard/tenants" variant="secondary">
                Partnerzy
              </BrandButton>

              <BrandButton href="/dashboard">
                Dashboard
                <ArrowRight size={16} />
              </BrandButton>
            </div>
          }
        />


        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Partnerzy"
            value={tenants.length}
            helper="Wszyscy partnerzy widoczni w control DB."
            icon={<ServerCog size={20} />}
          />

          <MetricCard
            label="Aktywni"
            value={activeTenants.length}
            helper="Partnerzy, dla których można uruchamiać operacje."
            icon={<CheckCircle2 size={20} />}
            progress={percent(activeTenants.length, tenants.length)}
          />

          <MetricCard
            label="Gotowe bazy"
            value={readyDatabases.length}
            helper="Bazy po poprawnie zakończonej migracji."
            icon={<Database size={20} />}
            progress={percent(readyDatabases.length, tenants.length)}
          />

          <MetricCard
            label="Wymagają uwagi"
            value={failedDatabases.length + missingOrPendingDatabases.length}
            helper="Błędy, brak bazy albo migracje oczekujące."
            icon={<TriangleAlert size={20} />}
            progress={percent(
              failedDatabases.length + missingOrPendingDatabases.length,
              tenants.length,
            )}
          />
        </section>

        <section className="rounded-[2rem] hv-brand-card">
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-start md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <Layers3 size={20} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
                  Migracje zbiorcze
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                  Uruchom migracje dla aktywnych partnerów.
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">
                  Ta akcja uruchamia pliki migracji znajdujące się w{" "}
                  <code className="rounded-md bg-[#f3f4f6] px-1.5 py-0.5 font-mono text-xs text-[#171717]">
                    drizzle/migrations/tenant
                  </code>{" "}
                  na bazach aktywnych partnerów. Nie generuje nowych migracji.
                </p>
              </div>
            </div>

            <div className="md:min-w-64">
              <MigrateAllTenantsButton />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <Database size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Status baz partnerów
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Przegląd statusów, wersji schemy i ostatnich migracji. Dla
                  aktywnych partnerów możesz uruchomić migrację, naprawić bazę
                  albo przejść do panelu partnera.
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {tenants.length} partnerów
            </Badge>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {tenants.length === 0 ? (
              <EmptyPanel>Brak partnerów.</EmptyPanel>
            ) : (
              <>
                <div className="grid gap-4 lg:hidden">
                  {tenants.map((tenant) => (
                    <article
                      key={tenant.tenantId}
                      className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                            {tenant.tenantName}
                          </h3>

                          <p className="mt-1 font-mono text-xs text-[#6b7280]">
                            {tenant.tenantSlug}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`shrink-0 rounded-full ${getMigrationBadgeClassName(
                            tenant.migrationStatus,
                          )}`}
                        >
                          <span className="mr-1">
                            {getMigrationIcon(tenant.migrationStatus)}
                          </span>
                          {getMigrationLabel(tenant.migrationStatus)}
                        </Badge>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#6b7280]">Status partnera</dt>
                          <dd>
                            <Badge
                              variant="outline"
                              className={`rounded-full ${getTenantStatusBadgeClassName(
                                tenant.tenantStatus,
                              )}`}
                            >
                              {getTenantStatusLabel(tenant.tenantStatus)}
                            </Badge>
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[#6b7280]">Baza danych</dt>
                          <dd className="mt-0.5 font-mono text-xs text-[#171717]">
                            {tenant.databaseName ?? "—"}
                          </dd>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-[#6b7280]">Wersja schemy</dt>
                            <dd className="mt-0.5 font-mono text-xs text-[#171717]">
                              {tenant.schemaVersion ?? "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[#6b7280]">Aktualizacja</dt>
                            <dd className="mt-0.5 text-[#171717]">
                              {formatDate(tenant.updatedAt)}
                            </dd>
                          </div>
                        </div>

                        <div>
                          <dt className="text-[#6b7280]">Ostatnia migracja</dt>
                          <dd className="mt-0.5 text-[#171717]">
                            {formatDate(tenant.lastMigratedAt)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5">
                        {tenant.tenantStatus === "active" ? (
                          <div className="flex flex-wrap gap-2">
                            <MigrateTenantButton tenantId={tenant.tenantId} />

                            {tenant.migrationStatus !== "success" ? (
                              <ReprovisionTenantDatabaseButton
                                tenantId={tenant.tenantId}
                              />
                            ) : null}

                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                            >
                              <Link href={`/t/${tenant.tenantSlug}/dashboard`}>
                                Otwórz
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <p className="rounded-[1rem] border border-black/10 bg-white/70 px-3 py-2 text-sm text-[#6b7280]">
                            Partner nieaktywny — operacje migracyjne są
                            niedostępne.
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1120px] text-left text-sm">
                      <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Partner</th>
                          <th className="px-4 py-3 font-semibold">
                            Status partnera
                          </th>
                          <th className="px-4 py-3 font-semibold">Baza</th>
                          <th className="px-4 py-3 font-semibold">Migracje</th>
                          <th className="px-4 py-3 font-semibold">Wersja</th>
                          <th className="px-4 py-3 font-semibold">
                            Ostatnia migracja
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            Aktualizacja
                          </th>
                          <th className="px-4 py-3 font-semibold">Akcje</th>
                        </tr>
                      </thead>

                      <tbody>
                        {tenants.map((tenant) => (
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
                              <Badge
                                variant="outline"
                                className={`rounded-full ${getTenantStatusBadgeClassName(
                                  tenant.tenantStatus,
                                )}`}
                              >
                                {getTenantStatusLabel(tenant.tenantStatus)}
                              </Badge>
                            </td>

                            <td className="px-4 py-4 font-mono text-xs text-[#171717]">
                              {tenant.databaseName ?? "—"}
                            </td>

                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className={`rounded-full ${getMigrationBadgeClassName(
                                  tenant.migrationStatus,
                                )}`}
                              >
                                <span className="mr-1">
                                  {getMigrationIcon(tenant.migrationStatus)}
                                </span>
                                {getMigrationLabel(tenant.migrationStatus)}
                              </Badge>
                            </td>

                            <td className="px-4 py-4 font-mono text-xs text-[#171717]">
                              {tenant.schemaVersion ?? "—"}
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              {formatDate(tenant.lastMigratedAt)}
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              {formatDate(tenant.updatedAt)}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {tenant.tenantStatus === "active" ? (
                                  <>
                                    <MigrateTenantButton
                                      tenantId={tenant.tenantId}
                                    />

                                    {tenant.migrationStatus !== "success" ? (
                                      <ReprovisionTenantDatabaseButton
                                        tenantId={tenant.tenantId}
                                      />
                                    ) : null}

                                    <Button
                                      asChild
                                      size="sm"
                                      variant="outline"
                                      className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                                    >
                                      <Link
                                        href={`/t/${tenant.tenantSlug}/dashboard`}
                                      >
                                        Otwórz
                                      </Link>
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-sm text-[#6b7280]">
                                    Partner nieaktywny
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}