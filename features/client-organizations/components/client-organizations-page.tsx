// features/client-organizations/components/client-organizations-page.tsx

import {
  Building2,
  CheckCircle2,
  Clock3,
  Factory,
  Layers3,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { PageHeader } from "@/shared/ui";

import { listClientOrganizations } from "../api/client-organization.queries";
import { CLIENT_ORGANIZATION_STATUS_OPTIONS } from "../forms/client-organization.schema";
import { ClientOrganizationRowActions } from "./client-organization-row-actions";
import { CreateClientOrganizationForm } from "./create-client-organization-form";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getStatusLabel(status: string) {
  return (
    CLIENT_ORGANIZATION_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

function getStatusBadgeClassName(status: string) {
  if (status === "active") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "draft" || status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "archived" || status === "inactive" || status === "disabled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
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

type ClientOrganizationsPageProps = {
  tenantSlug: string;
};

export async function ClientOrganizationsPage({
  tenantSlug,
}: ClientOrganizationsPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canRead = ctx.permissions.includes("client_organization:read");
  const canCreate = ctx.permissions.includes("client_organization:create");

  if (!canRead) {
    throw new Error("Missing permission: client_organization:read");
  }

  const db = await getTenantDb(ctx);
  const organizations = await listClientOrganizations(db);

  const activeOrganizationsCount = organizations.filter(
    (organization) => organization.status === "active",
  ).length;

  const archivedOrganizationsCount = organizations.filter(
    (organization) => organization.status === "archived",
  ).length;

  const organizationsWithIndustryCount = organizations.filter(
    (organization) => organization.industry,
  ).length;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Organizacje klientów"
          description="Firmy, jednostki lub organizacje, dla których prowadzone są badania."
        />

        

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Organizacje"
            value={organizations.length}
            helper="Wszystkie organizacje."
            icon={<Building2 size={20} />}
          />

          <MetricCard
            label="Aktywne"
            value={activeOrganizationsCount}
            helper="Organizacje dostępne do pracy operacyjnej."
            icon={<CheckCircle2 size={20} />}
            progress={percent(activeOrganizationsCount, organizations.length)}
          />

          <MetricCard
            label="Z branżą"
            value={organizationsWithIndustryCount}
            helper="Organizacje z uzupełnionym kontekstem branżowym."
            icon={<Factory size={20} />}
            progress={percent(
              organizationsWithIndustryCount,
              organizations.length,
            )}
          />

          <MetricCard
            label="Archiwalne"
            value={archivedOrganizationsCount}
            helper="Organizacje ukryte z aktywnej pracy."
            icon={<Layers3 size={20} />}
            progress={percent(archivedOrganizationsCount, organizations.length)}
          />
        </section>

        <CreateClientOrganizationForm
          tenantSlug={ctx.tenantSlug}
          canCreate={canCreate}
        />

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <Building2 size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Lista organizacji klientów
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Przegląd firm, jednostek lub organizacji, dla których
                  prowadzone są badania. Ustawienia dostępne są w kolumnie akcji.
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {organizations.length} organizacji
            </Badge>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {organizations.length === 0 ? (
              <EmptyPanel>
                Brak organizacji klientów. Dodaj pierwszą organizację, aby
                porządkować projekty badawcze i respondentów.
              </EmptyPanel>
            ) : (
              <>
                <div className="grid gap-4 lg:hidden">
                  {organizations.map((organization) => (
                    <article
                      key={organization.id}
                      className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                            {organization.name}
                          </h3>

                          <p className="mt-1 truncate text-sm text-[#6b7280]">
                            {organization.industry ?? "Branża nieuzupełniona"}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`shrink-0 rounded-full ${getStatusBadgeClassName(
                            organization.status,
                          )}`}
                        >
                          {getStatusLabel(organization.status)}
                        </Badge>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#6b7280]">Wielkość</dt>
                          <dd className="font-medium text-[#171717]">
                            {organization.size ?? "—"}
                          </dd>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-[#6b7280]">Utworzono</dt>
                            <dd className="mt-0.5 text-[#171717]">
                              {formatDate(organization.createdAt)}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[#6b7280]">Aktualizacja</dt>
                            <dd className="mt-0.5 text-[#171717]">
                              {formatDate(organization.updatedAt)}
                            </dd>
                          </div>
                        </div>
                      </dl>

                      <div className="mt-5">
                        <ClientOrganizationRowActions
                          tenantSlug={ctx.tenantSlug}
                          organization={organization}
                          canManage={canCreate}
                        />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">
                            Organizacja
                          </th>
                          <th className="px-4 py-3 font-semibold">Branża</th>
                          <th className="px-4 py-3 font-semibold">Wielkość</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">
                            Utworzono
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            Aktualizacja
                          </th>
                          <th className="px-4 py-3 font-semibold">Akcje</th>
                        </tr>
                      </thead>

                      <tbody>
                        {organizations.map((organization) => (
                          <tr
                            key={organization.id}
                            className="border-b border-black/10 last:border-0"
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold text-[#171717]">
                                {organization.name}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {organization.industry ?? "—"}
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {organization.size ?? "—"}
                            </td>

                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className={`rounded-full ${getStatusBadgeClassName(
                                  organization.status,
                                )}`}
                              >
                                {getStatusLabel(organization.status)}
                              </Badge>
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 size={13} />
                                {formatDate(organization.createdAt)}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              {formatDate(organization.updatedAt)}
                            </td>

                            <td className="px-4 py-4">
                              <ClientOrganizationRowActions
                                tenantSlug={ctx.tenantSlug}
                                organization={organization}
                                canManage={canCreate}
                              />
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