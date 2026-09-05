// @humanet-respondent-directory-v1
// features/respondents/components/respondents-page.tsx

import type { ReactNode } from "react";
import {
  Building2,
  IdCard,
  Mail,
  UserRound,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { PageHeader } from "@/shared/ui";
import { RespondentImportExportDialog } from "./respondent-import-export-dialog";
import {
  listRespondentOrganizations,
  listRespondents,
  listRespondentUnits,
} from "../api/respondent.queries";
import { CreateRespondentForm } from "./create-respondent-form";
import { RespondentDirectory } from "./respondent-directory";

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

type RespondentsPageProps = {
  tenantSlug: string;
};

export async function RespondentsPage({ tenantSlug }: RespondentsPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canRead = ctx.permissions.includes("respondent:read");
  const canCreate = ctx.permissions.includes("respondent:create");
  const canUpdate = ctx.permissions.includes("respondent:update");

  if (!canRead) {
    throw new Error("Missing permission: respondent:read");
  }

  const db = await getTenantDb(ctx);

  const [respondents, organizations, units] = await Promise.all([
    listRespondents(db),
    listRespondentOrganizations(db),
    listRespondentUnits(db),
  ]);

  const respondentsWithEmailCount = respondents.filter(
    (respondent) => respondent.email,
  ).length;

  const respondentsWithOrganizationCount = respondents.filter(
    (respondent) => respondent.clientOrganizationId,
  ).length;

  const respondentsWithUnitCount = respondents.filter(
    (respondent) => respondent.clientUnitId,
  ).length;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Respondenci"
          description="Uczestnicy badań przypisani do organizacji i jednostek klienta."
        />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Respondenci"
            value={respondents.length}
            helper="Wszystkie osoby w bazie."
            icon={<Users size={20} />}
          />

          <MetricCard
            label="Z emailem"
            value={respondentsWithEmailCount}
            helper="Respondenci możliwi do kontaktu mailowego."
            icon={<Mail size={20} />}
            progress={percent(respondentsWithEmailCount, respondents.length)}
          />

          <MetricCard
            label="Z organizacją"
            value={respondentsWithOrganizationCount}
            helper="Respondenci przypisani do organizacji klienta."
            icon={<Building2 size={20} />}
            progress={percent(
              respondentsWithOrganizationCount,
              respondents.length,
            )}
          />

          <MetricCard
            label="Z jednostką"
            value={respondentsWithUnitCount}
            helper="Respondenci przypisani do działu, zespołu lub jednostki."
            icon={<IdCard size={20} />}
            progress={percent(respondentsWithUnitCount, respondents.length)}
          />
        </section>

        <CreateRespondentForm
          tenantSlug={ctx.tenantSlug}
          canCreate={canCreate}
          organizations={organizations}
          units={units}
        />

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <UserRound size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Lista respondentów
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Wyszukuj, filtruj i sortuj uczestników badań. Edycja jest
                  dostępna w kolumnie akcji.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RespondentImportExportDialog
                tenantSlug={ctx.tenantSlug}
                canCreate={canCreate}
              />

              <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                {respondents.length} respondentów
              </Badge>
            </div>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            <RespondentDirectory
              tenantSlug={ctx.tenantSlug}
              respondents={respondents}
              organizations={organizations}
              units={units}
              canManage={canUpdate}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
