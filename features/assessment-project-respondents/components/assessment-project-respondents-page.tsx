// features/assessment-project-respondents/components/assessment-project-respondents-page.tsx

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Link2,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { and, eq, isNull } from "drizzle-orm";

import { AccessLinkActions } from "@/features/assessment-access-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assessmentProjects } from "@/drizzle/schema/tenant-schema";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { PageHeader } from "@/shared/ui";
import {
  listAssessmentProjectRespondents,
  listAssessmentProjectRespondentOrganizationOptions,
  listAssessmentProjectRespondentUnitOptions,
  listRespondentOptionsForProject,
} from "../api/assessment-project-respondent.queries";
import { BulkAddProjectRespondentsDialog } from "./bulk-add-project-respondents-dialog";
import { ASSESSMENT_PROJECT_RESPONDENT_STATUS_OPTIONS } from "../forms/assessment-project-respondent.schema";
import { AddProjectRespondentForm } from "./add-project-respondent-form";
import { ProjectRespondentRowActions } from "./project-respondent-row-actions";

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getRespondentName(participant: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}) {
  const fullName = [participant.firstName, participant.lastName]
    .filter(Boolean)
    .join(" ");

  return fullName || participant.email || "—";
}

function getStatusLabel(status: string) {
  return (
    ASSESSMENT_PROJECT_RESPONDENT_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

function getStatusBadgeClassName(status: string) {
  if (status === "completed") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "invited" || status === "opened" || status === "in_progress") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "cancelled" || status === "archived") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
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

type AssessmentProjectRespondentsPageProps = {
  tenantSlug: string;
  assessmentProjectId: string;
};

export async function AssessmentProjectRespondentsPage({
  tenantSlug,
  assessmentProjectId,
}: AssessmentProjectRespondentsPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canRead = ctx.permissions.includes("assessment_project_respondent:read");
  const canCreate = ctx.permissions.includes(
    "assessment_project_respondent:create",
  );
  const canUpdate = ctx.permissions.includes(
    "assessment_project_respondent:update",
  );

  if (!canRead) {
    throw new Error("Missing permission: assessment_project_respondent:read");
  }

  const db = await getTenantDb(ctx);

  const project = await db.query.assessmentProjects.findFirst({
    where: and(
      eq(assessmentProjects.id, assessmentProjectId),
      isNull(assessmentProjects.deletedAt),
    ),
  });

  if (!project) {
    throw new Error("Assessment project not found.");
  }

  const [
    participants,
    respondentOptions,
    organizationOptions,
    unitOptions,
  ] = await Promise.all([
    listAssessmentProjectRespondents({
      db,
      assessmentProjectId,
    }),
    listRespondentOptionsForProject({
      db,
      assessmentProjectId,
    }),
    listAssessmentProjectRespondentOrganizationOptions({
      db,
    }),
    listAssessmentProjectRespondentUnitOptions({
      db,
    }),
  ]);

  const completedParticipantsCount = participants.filter(
    (participant) => participant.completedAt || participant.sessionStatus === "completed",
  ).length;

  const invitedParticipantsCount = participants.filter(
    (participant) => participant.invitedAt,
  ).length;

  const activeLinksCount = participants.filter(
    (participant) => participant.activeAccessLinkId,
  ).length;

  const resultsAvailableCount = participants.filter(
    (participant) => participant.sessionId && participant.sessionStatus === "completed",
  ).length;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Uczestnicy projektu"
          description="Respondenci przypisani do konkretnego projektu badawczego."
          actions={
            <Button
              asChild
              variant="outline"
              className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
            >
              <Link href={`/t/${ctx.tenantSlug}/assessment-projects`}>
                <ArrowLeft size={16} />
                Wróć do projektów
              </Link>
            </Button>
          }
        />

        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Projekt badawczy
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                {project.name}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Zarządzaj uczestnikami projektu, generuj linki dostępowe,
                monitoruj ukończenie sesji i przechodź do wyników zakończonych
                badań.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <Users size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Uczestnicy
                  </p>
                  <p className="mt-0.5 text-sm text-[#6b7280]">
                    {participants.length} przypisanych
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Uczestnicy"
            value={participants.length}
            helper="Respondenci przypisani do projektu."
            icon={<Users size={20} />}
          />

          <MetricCard
            label="Zaproszeni"
            value={invitedParticipantsCount}
            helper="Uczestnicy, do których wysłano zaproszenie lub utworzono dostęp."
            icon={<Link2 size={20} />}
            progress={percent(invitedParticipantsCount, participants.length)}
          />

          <MetricCard
            label="Ukończone"
            value={completedParticipantsCount}
            helper="Respondenci z zakończoną sesją badania."
            icon={<CheckCircle2 size={20} />}
            progress={percent(completedParticipantsCount, participants.length)}
          />

          <MetricCard
            label="Wyniki"
            value={resultsAvailableCount}
            helper="Sesje zakończone z dostępnym widokiem wyników."
            icon={<FileText size={20} />}
            progress={percent(resultsAvailableCount, participants.length)}
          />
        </section>

        <div className="space-y-4">
          <div className="flex justify-end">
            <BulkAddProjectRespondentsDialog
              tenantSlug={ctx.tenantSlug}
              assessmentProjectId={assessmentProjectId}
              canAdd={canCreate}
              organizationOptions={organizationOptions}
              unitOptions={unitOptions}
            />
          </div>

          <AddProjectRespondentForm
            tenantSlug={ctx.tenantSlug}
            assessmentProjectId={assessmentProjectId}
            canAdd={canCreate}
            respondentOptions={respondentOptions}
          />
        </div>
        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <UserRound size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Lista uczestników
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Przegląd respondentów przypisanych do projektu, ich statusów,
                  linków dostępowych i wyników zakończonych sesji.
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {participants.length} uczestników
            </Badge>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {participants.length === 0 ? (
              <EmptyPanel>
                Brak respondentów przypisanych do tego projektu. Dodaj pierwszą
                osobę, aby wygenerować link dostępowy i rozpocząć zbieranie
                odpowiedzi.
              </EmptyPanel>
            ) : (
              <>
                <div className="grid gap-4 xl:hidden">
                  {participants.map((participant) => {
                    const respondentName = getRespondentName(participant);
                    const hasResults =
                      participant.sessionId &&
                      participant.sessionStatus === "completed";

                    return (
                      <article
                        key={participant.id}
                        className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                              {respondentName}
                            </h3>

                            <p className="mt-1 truncate font-mono text-xs text-[#6b7280]">
                              {participant.email ?? participant.externalCode ?? "—"}
                            </p>
                          </div>

                          <Badge
                            variant="outline"
                            className={`shrink-0 rounded-full ${getStatusBadgeClassName(
                              participant.status,
                            )}`}
                          >
                            {getStatusLabel(participant.status)}
                          </Badge>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-[#6b7280]">Organizacja</dt>
                            <dd className="mt-0.5 font-medium text-[#171717]">
                              {participant.clientOrganizationName ?? "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[#6b7280]">Jednostka</dt>
                            <dd className="mt-0.5 font-medium text-[#171717]">
                              {participant.clientUnitName ?? "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[#6b7280]">Zaproszony</dt>
                            <dd className="mt-0.5 text-[#171717]">
                              {formatDate(participant.invitedAt)}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[#6b7280]">Ukończony</dt>
                            <dd className="mt-0.5 text-[#171717]">
                              {formatDate(participant.completedAt)}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4 rounded-[1.25rem] border border-black/10 bg-white/70 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#171717]">
                                Link dostępowy
                              </p>
                              <p className="mt-0.5 text-xs text-[#6b7280]">
                                {participant.activeAccessLinkId
                                  ? `Aktywny do: ${formatDate(participant.accessLinkExpiresAt)}`
                                  : "Brak aktywnego linku"}
                              </p>
                            </div>

                            {participant.activeAccessLinkId ? (
                              <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                                aktywny
                              </Badge>
                            ) : null}
                          </div>

                          <AccessLinkActions
                            tenantSlug={ctx.tenantSlug}
                            assessmentProjectId={assessmentProjectId}
                            projectRespondentId={participant.id}
                            activeAccessLinkId={participant.activeAccessLinkId}
                            canManage={canUpdate}
                            activeAccessUrl={participant.activeAccessUrl}
                          />
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {hasResults ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                            >
                              <Link
                                href={`/t/${ctx.tenantSlug}/assessment-sessions/${participant.sessionId}/results`}
                              >
                                <ExternalLink size={14} />
                                Wyniki
                              </Link>
                            </Button>
                          ) : null}

                          <ProjectRespondentRowActions
                            tenantSlug={ctx.tenantSlug}
                            participant={participant}
                            canManage={canUpdate}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 xl:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] text-left text-sm">
                      <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Respondent</th>
                          <th className="px-4 py-3 font-semibold">Email / kod</th>
                          <th className="px-4 py-3 font-semibold">Organizacja</th>
                          <th className="px-4 py-3 font-semibold">Jednostka</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Zaproszony</th>
                          <th className="px-4 py-3 font-semibold">Link</th>
                          <th className="px-4 py-3 font-semibold">Ukończony</th>
                          <th className="px-4 py-3 font-semibold">Wyniki</th>
                          <th className="px-4 py-3 font-semibold">Akcje</th>
                        </tr>
                      </thead>

                      <tbody>
                        {participants.map((participant) => {
                          const hasResults =
                            participant.sessionId &&
                            participant.sessionStatus === "completed";

                          return (
                            <tr
                              key={participant.id}
                              className="border-b border-black/10 last:border-0"
                            >
                              <td className="px-4 py-4">
                                <div className="font-semibold text-[#171717]">
                                  {getRespondentName(participant)}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="text-[#171717]">
                                  {participant.email ?? "—"}
                                </div>
                                <div className="font-mono text-xs text-[#6b7280]">
                                  {participant.externalCode ?? "—"}
                                </div>
                              </td>

                              <td className="px-4 py-4 text-[#171717]">
                                {participant.clientOrganizationName ?? "—"}
                              </td>

                              <td className="px-4 py-4 text-[#171717]">
                                {participant.clientUnitName ?? "—"}
                              </td>

                              <td className="px-4 py-4">
                                <Badge
                                  variant="outline"
                                  className={`rounded-full ${getStatusBadgeClassName(
                                    participant.status,
                                  )}`}
                                >
                                  {getStatusLabel(participant.status)}
                                </Badge>
                              </td>

                              <td className="px-4 py-4 text-[#6b7280]">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3 size={13} />
                                  {formatDate(participant.invitedAt)}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <div className="space-y-2">
                                  {participant.activeAccessLinkId ? (
                                    <div className="text-xs text-[#6b7280]">
                                      Aktywny do: {formatDate(participant.accessLinkExpiresAt)}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-[#6b7280]">
                                      Brak aktywnego linku
                                    </div>
                                  )}

                                  <AccessLinkActions
                                    tenantSlug={ctx.tenantSlug}
                                    assessmentProjectId={assessmentProjectId}
                                    projectRespondentId={participant.id}
                                    activeAccessLinkId={participant.activeAccessLinkId}
                                    canManage={canUpdate}
                                    activeAccessUrl={participant.activeAccessUrl}
                                  />
                                </div>
                              </td>

                              <td className="px-4 py-4 text-[#6b7280]">
                                {formatDate(participant.completedAt)}
                              </td>

                              <td className="px-4 py-4">
                                {hasResults ? (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                                  >
                                    <Link
                                      href={`/t/${ctx.tenantSlug}/assessment-sessions/${participant.sessionId}/results`}
                                    >
                                      Wyniki
                                    </Link>
                                  </Button>
                                ) : (
                                  <span className="text-xs text-[#6b7280]">—</span>
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <ProjectRespondentRowActions
                                  tenantSlug={ctx.tenantSlug}
                                  participant={participant}
                                  canManage={canUpdate}
                                />
                              </td>
                            </tr>
                          );
                        })}
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
