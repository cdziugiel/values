// features/respondents/components/respondents-page.tsx

import type { ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  IdCard,
  Mail,
  Phone,
  ShieldCheck,
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
import { RespondentRowActions } from "./respondent-row-actions";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getRespondentName({
  firstName,
  lastName,
  email,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || email || "—";
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

        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Baza respondentów
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                Osoby uczestniczące w badaniach.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Zarządzaj respondentami, przypisuj ich do organizacji i
                jednostek oraz utrzymuj dane identyfikacyjne oddzielone od
                wyników badań.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <Users size={20} />
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
            label="Respondenci"
            value={respondents.length}
            helper="Wszystkie osoby w bazie respondenta partnera."
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
                  Przegląd uczestników badań, ich organizacji, jednostek i
                  danych kontaktowych. Edycja jest dostępna w kolumnie akcji.
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
            {respondents.length === 0 ? (
              <EmptyPanel>
                Brak respondentów. Dodaj pierwszą osobę, aby móc przypisywać ją
                do projektów badawczych.
              </EmptyPanel>
            ) : (
              <>
                <div className="grid gap-4 lg:hidden">
                  {respondents.map((respondent) => (
                    <article
                      key={respondent.id}
                      className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                            {getRespondentName(respondent)}
                          </h3>

                          <p className="mt-1 truncate font-mono text-xs text-[#6b7280]">
                            {respondent.email ?? respondent.externalCode ?? "—"}
                          </p>
                        </div>

                        {respondent.externalCode ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
                          >
                            {respondent.externalCode}
                          </Badge>
                        ) : null}
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#6b7280]">Organizacja</dt>
                          <dd className="text-right font-medium text-[#171717]">
                            {respondent.clientOrganizationName ?? "—"}
                          </dd>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#6b7280]">Jednostka</dt>
                          <dd className="text-right font-medium text-[#171717]">
                            {respondent.clientUnitName ?? "—"}
                          </dd>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#6b7280]">Telefon</dt>
                          <dd className="text-right font-medium text-[#171717]">
                            {respondent.phone ?? "—"}
                          </dd>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#6b7280]">Utworzono</dt>
                          <dd className="text-right text-[#171717]">
                            {formatDate(respondent.createdAt)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5">
                        <RespondentRowActions
                          tenantSlug={ctx.tenantSlug}
                          respondent={respondent}
                          organizations={organizations}
                          units={units}
                          canManage={canUpdate}
                        />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-left text-sm">
                      <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">
                            Respondent
                          </th>
                          <th className="px-4 py-3 font-semibold">Email</th>
                          <th className="px-4 py-3 font-semibold">Kod</th>
                          <th className="px-4 py-3 font-semibold">
                            Organizacja
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            Jednostka
                          </th>
                          <th className="px-4 py-3 font-semibold">Telefon</th>
                          <th className="px-4 py-3 font-semibold">
                            Utworzono
                          </th>
                          <th className="px-4 py-3 font-semibold">Akcje</th>
                        </tr>
                      </thead>

                      <tbody>
                        {respondents.map((respondent) => (
                          <tr
                            key={respondent.id}
                            className="border-b border-black/10 last:border-0"
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold text-[#171717]">
                                {getRespondentName(respondent)}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {respondent.email ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Mail size={13} className="text-[#8b9099]" />
                                  {respondent.email}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {respondent.externalCode ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
                                >
                                  {respondent.externalCode}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {respondent.clientOrganizationName ?? "—"}
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {respondent.clientUnitName ?? "—"}
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {respondent.phone ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Phone size={13} className="text-[#8b9099]" />
                                  {respondent.phone}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 size={13} />
                                {formatDate(respondent.createdAt)}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <RespondentRowActions
                                tenantSlug={ctx.tenantSlug}
                                respondent={respondent}
                                organizations={organizations}
                                units={units}
                                canManage={canUpdate}
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
