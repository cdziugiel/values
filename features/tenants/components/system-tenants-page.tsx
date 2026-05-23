import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/ui";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import { listSystemTenants } from "../api/tenant.queries";
import { CreateTenantForm } from "./create-tenant-form";
import { TenantRowActions } from "./tenant-row-actions";

type SystemTenantsPageProps = {
  showArchived?: boolean;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getStatusLabel(status: string | null) {
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

function getStatusBadgeClassName(status: string | null) {
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

  return "border-black/10 bg-white/70 text-[#6b7280]";
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

export async function SystemTenantsPage({
  showArchived = false,
}: SystemTenantsPageProps) {
  await requireSuperAdmin();

  const tenants = await listSystemTenants();
  const archivedTenantsCount = tenants.filter(
    (tenant) => tenant.status === "archived",
  ).length;

  const visibleTenants = showArchived
    ? tenants
    : tenants.filter((tenant) => tenant.status !== "archived");

  const activeTenantsCount = tenants.filter(
    (tenant) => tenant.status === "active",
  ).length;

  const readyDatabasesCount = tenants.filter(
    (tenant) => tenant.migrationStatus === "success",
  ).length;

  const tenantsWithOwnerCount = tenants.filter(
    (tenant) => tenant.ownerEmail,
  ).length;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Partnerzy"
          description="Zarządzanie partnerami HUMANET, ich bazami danych, właścicielami i statusem migracji."
          actions={
            <div className="flex flex-wrap gap-2">
              <BrandButton
                href={showArchived ? "/dashboard/tenants" : "/dashboard/tenants?archived=1"}
                variant="secondary"
              >
                {showArchived ? "Ukryj zarchiwizowanych" : "Pokaż zarchiwizowanych"}
              </BrandButton>

              <BrandButton href="/dashboard/tenant-migrations" variant="secondary">
                Migracje baz
              </BrandButton>

              <BrandButton href="/dashboard">
                Dashboard
                <ArrowRight size={16} />
              </BrandButton>
            </div>
          }
        />


        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Partnerzy"
            value={tenants.length}
            helper="Wszyscy partnerzy widoczni w control DB."
            icon={<Building2 size={20} />}
          />

          <MetricCard
            label="Aktywni"
            value={activeTenantsCount}
            helper="Partnerzy z aktywnym dostępem do systemu."
            icon={<CheckCircle2 size={20} />}
            progress={percent(activeTenantsCount, tenants.length)}
          />

          <MetricCard
            label="Właściciele"
            value={tenantsWithOwnerCount}
            helper="Partnerzy z przypisanym ownerem."
            icon={<Users size={20} />}
            progress={percent(tenantsWithOwnerCount, tenants.length)}
          />
        </section>

        <CreateTenantForm />

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <Building2 size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Lista partnerów
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Przegląd statusów, ownerów, baz danych i migracji.
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {tenants.length} partnerów
            </Badge>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {tenants.length === 0 ? (
              <EmptyPanel>
                Brak partnerów. Utwórz pierwszego partnera, aby przygotować
                osobną bazę danych i nadać dostęp właścicielowi.
              </EmptyPanel>
            ) : (
              <>
                <div className="grid gap-4 lg:hidden">
                  {visibleTenants.map((tenant) => (
                    <article
                      key={tenant.id}
                      className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                            {tenant.name}
                          </h3>

                          <p className="mt-1 font-mono text-xs text-[#6b7280]">
                            {tenant.slug}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`rounded-full ${getStatusBadgeClassName(
                            tenant.status,
                          )}`}
                        >
                          {getStatusLabel(tenant.status)}
                        </Badge>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <div>
                          <dt className="text-[#6b7280]">Owner</dt>
                          <dd className="mt-0.5 font-medium text-[#171717]">
                            {tenant.ownerEmail ?? "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[#6b7280]">Baza danych</dt>
                          <dd className="mt-0.5 font-mono text-xs text-[#171717]">
                            {tenant.databaseName ?? "—"}
                          </dd>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <dt className="text-[#6b7280]">Migracje</dt>
                            <dd className="mt-1">
                              <Badge
                                variant="outline"
                                className={`rounded-full ${getMigrationBadgeClassName(
                                  tenant.migrationStatus,
                                )}`}
                              >
                                {getMigrationLabel(tenant.migrationStatus)}
                              </Badge>
                            </dd>
                          </div>

                          <div className="text-right">
                            <dt className="text-[#6b7280]">Wersja</dt>
                            <dd className="mt-0.5 font-mono text-xs text-[#171717]">
                              {tenant.schemaVersion ?? "—"}
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

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button
                          asChild
                          size="sm"
                          className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                        >
                          <Link href={`/t/${tenant.slug}/dashboard`}>
                            Otwórz
                          </Link>
                        </Button>

                        <TenantRowActions
                          tenant={{
                            id: tenant.id,
                            name: tenant.name,
                            slug: tenant.slug,
                            status: tenant.status,
                            ownerEmail: tenant.ownerEmail,
                          }}
                        />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left text-sm">
                      <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Partner</th>
                          <th className="px-4 py-3 font-semibold">Owner</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Baza</th>
                          <th className="px-4 py-3 font-semibold">Migracje</th>
                          <th className="px-4 py-3 font-semibold">Wersja</th>
                          <th className="px-4 py-3 font-semibold">
                            Ostatnia migracja
                          </th>
                          <th className="px-4 py-3 font-semibold">Akcje</th>
                        </tr>
                      </thead>

                      <tbody>
                        {visibleTenants.map((tenant) => (
                          <tr
                            key={tenant.id}
                            className="border-b border-black/10 last:border-0"
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold text-[#171717]">
                                {tenant.name}
                              </div>

                              <div className="font-mono text-xs text-[#6b7280]">
                                {tenant.slug}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {tenant.ownerEmail ?? "—"}
                            </td>

                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className={`rounded-full ${getStatusBadgeClassName(
                                  tenant.status,
                                )}`}
                              >
                                {getStatusLabel(tenant.status)}
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
                                {getMigrationLabel(tenant.migrationStatus)}
                              </Badge>
                            </td>

                            <td className="px-4 py-4 font-mono text-xs text-[#171717]">
                              {tenant.schemaVersion ?? "—"}
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              {formatDate(tenant.lastMigratedAt)}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  asChild
                                  size="sm"
                                  className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                                >
                                  <Link href={`/t/${tenant.slug}/dashboard`}>
                                    Otwórz
                                  </Link>
                                </Button>

                                <TenantRowActions
                                  tenant={{
                                    id: tenant.id,
                                    name: tenant.name,
                                    slug: tenant.slug,
                                    status: tenant.status,
                                    ownerEmail: tenant.ownerEmail,
                                  }}
                                />
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