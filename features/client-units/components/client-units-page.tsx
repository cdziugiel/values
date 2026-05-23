// features/client-units/components/client-units-page.tsx

import type { ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Factory,
  GitBranch,
  Layers3,
  Network,
  ShieldCheck,
} from "lucide-react";
import { ClientUnitImportExportDialog } from "./client-unit-import-export-dialog";
import { Badge } from "@/components/ui/badge";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { PageHeader } from "@/shared/ui";

import {
  listClientUnitOrganizations,
  listClientUnitParentOptions,
  listClientUnits,
} from "../api/client-unit.queries";
import { CLIENT_UNIT_TYPE_OPTIONS } from "../forms/client-unit.schema";
import { ClientUnitRowActions } from "./client-unit-row-actions";
import { CreateClientUnitForm } from "./create-client-unit-form";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getTypeLabel(type: string) {
  return CLIENT_UNIT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function getTypeBadgeClassName(type: string) {
  if (type === "department") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (type === "team") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (type === "location") {
    return "border-amber-200 bg-amber-50 text-amber-700";
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

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

type ClientUnitsPageProps = {
  tenantSlug: string;
};

export async function ClientUnitsPage({ tenantSlug }: ClientUnitsPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canRead = ctx.permissions.includes("client_unit:read");
  const canCreate = ctx.permissions.includes("client_unit:create");
  const canUpdate = ctx.permissions.includes("client_unit:update");
  const canImport = canCreate && canUpdate;
  if (!canRead) {
    throw new Error("Missing permission: client_unit:read");
  }

  const db = await getTenantDb(ctx);

  const [units, organizations, parentOptions] = await Promise.all([
    listClientUnits(db),
    listClientUnitOrganizations(db),
    listClientUnitParentOptions(db),
  ]);

  const rootUnitsCount = units.filter((unit) => !unit.parentId).length;
  const childUnitsCount = units.filter((unit) => unit.parentId).length;
  const organizationsWithUnitsCount = new Set(
    units.map((unit) => unit.clientOrganizationId),
  ).size;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Jednostki organizacyjne"
          description="Działy, zespoły i struktury organizacji klienta."
        />

        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Struktura klienta
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                Działy, zespoły i jednostki do analiz organizacyjnych.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Odwzoruj strukturę organizacji klienta, aby później prowadzić
                badania i analizować wyniki na poziomie zespołów, działów,
                lokalizacji lub innych jednostek.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <Network size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Partner
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-[#6b7280]">
                    {ctx.tenantSlug}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Jednostki"
            value={units.length}
            helper="Wszystkie jednostki organizacyjne klienta."
            icon={<Network size={20} />}
          />

          <MetricCard
            label="Główne"
            value={rootUnitsCount}
            helper="Jednostki bez przypisanej jednostki nadrzędnej."
            icon={<GitBranch size={20} />}
            progress={percent(rootUnitsCount, units.length)}
          />

          <MetricCard
            label="Podrzędne"
            value={childUnitsCount}
            helper="Jednostki osadzone w hierarchii."
            icon={<Layers3 size={20} />}
            progress={percent(childUnitsCount, units.length)}
          />

          <MetricCard
            label="Organizacje"
            value={organizationsWithUnitsCount}
            helper="Organizacje, które mają już jednostki."
            icon={<Factory size={20} />}
            progress={percent(organizationsWithUnitsCount, organizations.length)}
          />
        </section>

        <CreateClientUnitForm
          tenantSlug={ctx.tenantSlug}
          canCreate={canCreate}
          organizations={organizations}
          parentOptions={parentOptions}
        />

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <Network size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Lista jednostek organizacyjnych
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Przegląd działów, zespołów i innych jednostek. Ustawienia są
                  dostępne w kolumnie akcji bez rozpychania tabeli.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ClientUnitImportExportDialog
                tenantSlug={ctx.tenantSlug}
                canImport={canImport}
              />

              <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                {units.length} jednostek
              </Badge>
            </div>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {units.length === 0 ? (
              <EmptyPanel>
                Brak jednostek organizacyjnych. Dodaj pierwszą jednostkę, aby
                odwzorować strukturę klienta.
              </EmptyPanel>
            ) : (
              <>
                <div className="grid gap-4 lg:hidden">
                  {units.map((unit) => (
                    <article
                      key={unit.id}
                      className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                            {unit.name}
                          </h3>

                          <p className="mt-1 truncate text-sm text-[#6b7280]">
                            {unit.clientOrganizationName}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`shrink-0 rounded-full ${getTypeBadgeClassName(
                            unit.type,
                          )}`}
                        >
                          {getTypeLabel(unit.type)}
                        </Badge>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#6b7280]">Nadrzędna</dt>
                          <dd className="font-medium text-[#171717]">
                            {unit.parentName ?? "—"}
                          </dd>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-[#6b7280]">Utworzono</dt>
                            <dd className="mt-0.5 text-[#171717]">
                              {formatDate(unit.createdAt)}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[#6b7280]">Aktualizacja</dt>
                            <dd className="mt-0.5 text-[#171717]">
                              {formatDate(unit.updatedAt)}
                            </dd>
                          </div>
                        </div>
                      </dl>

                      <div className="mt-5">
                        <ClientUnitRowActions
                          tenantSlug={ctx.tenantSlug}
                          unit={unit}
                          canManage={canUpdate}
                          organizations={organizations}
                          parentOptions={parentOptions}
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
                          <th className="px-4 py-3 font-semibold">Nazwa</th>
                          <th className="px-4 py-3 font-semibold">
                            Organizacja
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            Nadrzędna
                          </th>
                          <th className="px-4 py-3 font-semibold">Typ</th>
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
                        {units.map((unit) => (
                          <tr
                            key={unit.id}
                            className="border-b border-black/10 last:border-0"
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold text-[#171717]">
                                {unit.name}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {unit.clientOrganizationName}
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {unit.parentName ?? "—"}
                            </td>

                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className={`rounded-full ${getTypeBadgeClassName(
                                  unit.type,
                                )}`}
                              >
                                {getTypeLabel(unit.type)}
                              </Badge>
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 size={13} />
                                {formatDate(unit.createdAt)}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              {formatDate(unit.updatedAt)}
                            </td>

                            <td className="px-4 py-4">
                              <ClientUnitRowActions
                                tenantSlug={ctx.tenantSlug}
                                unit={unit}
                                canManage={canUpdate}
                                organizations={organizations}
                                parentOptions={parentOptions}
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