// features/assessment-projects/components/assessment-projects-page.tsx

import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Layers3,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { PageHeader } from "@/shared/ui";

import { listActiveQuestionnaireVersions } from "@/features/questionnaires/api/questionnaire.queries";
import {
  listAssessmentProjectQuestionnaireAssignments,
  ProjectQuestionnaireList,
} from "@/features/assessment-project-questionnaires";

import {
  listAssessmentProjectOrganizations,
  listAssessmentProjects,
} from "../api/assessment-project.queries";
import { ASSESSMENT_PROJECT_STATUS_OPTIONS } from "../forms/assessment-project.schema";
import { AssessmentProjectRowActions } from "./assessment-project-row-actions";
import { CreateAssessmentProjectForm } from "./create-assessment-project-form";

function formatDateTime(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(value);
}

function getStatusLabel(status: string) {
  return (
    ASSESSMENT_PROJECT_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

function getStatusBadgeClassName(status: string) {
  if (status === "active" || status === "completed") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "draft" || status === "planned") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "in_progress") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "archived" || status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
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
  children: ReactNode;
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

type AssessmentProjectsPageProps = {
  tenantSlug: string;
};

export async function AssessmentProjectsPage({
  tenantSlug,
}: AssessmentProjectsPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canRead = ctx.permissions.includes("assessment_project:read");
  const canCreate = ctx.permissions.includes("assessment_project:create");
  const canUpdate = ctx.permissions.includes("assessment_project:update");

  if (!canRead) {
    throw new Error("Missing permission: assessment_project:read");
  }

  const db = await getTenantDb(ctx);

  const [projects, organizations, questionnaireOptions] = await Promise.all([
    listAssessmentProjects(db),
    listAssessmentProjectOrganizations(db),
    listActiveQuestionnaireVersions(),
  ]);

  const projectQuestionnaireAssignments =
    await listAssessmentProjectQuestionnaireAssignments({
      db,
      assessmentProjectIds: projects.map((project) => project.id),
    });

  const projectQuestionnairesByProjectId =
    projectQuestionnaireAssignments.reduce(
      (acc, assignment) => {
        acc[assignment.assessmentProjectId] ??= [];
        acc[assignment.assessmentProjectId].push(assignment);
        return acc;
      },
      {} as Record<string, typeof projectQuestionnaireAssignments>,
    );

  const activeProjectsCount = projects.filter(
    (project) => project.status === "active",
  ).length;

  const draftProjectsCount = projects.filter(
    (project) => project.status === "draft" || project.status === "planned",
  ).length;

  const projectsWithOrganizationCount = projects.filter(
    (project) => project.clientOrganizationId,
  ).length;

  const assignedQuestionnaireCount = projectQuestionnaireAssignments.length;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Projekty badawcze"
          description="Zarządzanie projektami diagnostycznymi, respondentami, kwestionariuszami i raportami dla klientów."
        />

        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Diagnostyka klienta
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                Projekty, respondenci i raporty w jednym przepływie.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Twórz projekty badawcze, przypisuj kwestionariusze, zarządzaj
                uczestnikami i przechodź do wyników oraz raportów bez gubienia
                kontekstu klienta.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <ClipboardList size={20} />
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
            label="Projekty"
            value={projects.length}
            helper="Wszystkie projekty badawcze w tym środowisku."
            icon={<ClipboardList size={20} />}
          />

          <MetricCard
            label="Aktywne"
            value={activeProjectsCount}
            helper="Projekty gotowe do pracy operacyjnej."
            icon={<CheckCircle2 size={20} />}
            progress={percent(activeProjectsCount, projects.length)}
          />

          <MetricCard
            label="Robocze"
            value={draftProjectsCount}
            helper="Projekty w przygotowaniu lub planowaniu."
            icon={<CalendarDays size={20} />}
            progress={percent(draftProjectsCount, projects.length)}
          />

          <MetricCard
            label="Kwestionariusze"
            value={assignedQuestionnaireCount}
            helper="Przypisania narzędzi do projektów."
            icon={<Layers3 size={20} />}
          />
        </section>

        <CreateAssessmentProjectForm
          tenantSlug={ctx.tenantSlug}
          canCreate={canCreate}
          organizations={organizations}
        />

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <FileText size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Lista projektów
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Każdy projekt łączy organizację, harmonogram,
                  kwestionariusze, uczestników, wyniki oraz dostęp do raportów.
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {projects.length} projektów
            </Badge>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {projects.length === 0 ? (
              <EmptyPanel>
                Brak projektów badawczych. Utwórz pierwszy projekt, aby
                przypisać kwestionariusze i zaprosić respondentów.
              </EmptyPanel>
            ) : (
              <>
                <div className="grid gap-4 xl:hidden">
                  {projects.map((project) => (
                    <article
                      key={project.id}
                      className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                            {project.name}
                          </h3>

                          <p className="mt-1 truncate text-sm text-[#6b7280]">
                            {project.clientOrganizationName ?? "Brak organizacji"}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`shrink-0 rounded-full ${getStatusBadgeClassName(
                            project.status,
                          )}`}
                        >
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>

                      {project.description ? (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6b7280]">
                          {project.description}
                        </p>
                      ) : null}

                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-[#6b7280]">Start</dt>
                          <dd className="mt-0.5 text-[#171717]">
                            {formatDateTime(project.startsAt)}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[#6b7280]">Koniec</dt>
                          <dd className="mt-0.5 text-[#171717]">
                            {formatDateTime(project.endsAt)}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[#6b7280]">Aktualizacja</dt>
                          <dd className="mt-0.5 text-[#171717]">
                            {formatDateTime(project.updatedAt)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-white/60 p-3">
                        <ProjectQuestionnaireList
                          tenantSlug={ctx.tenantSlug}
                          assessmentProjectId={project.id}
                          assignedQuestionnaires={
                            projectQuestionnairesByProjectId[project.id] ?? []
                          }
                          options={questionnaireOptions}
                          canManage={canUpdate}
                        />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                        >
                          <Link
                            href={`/t/${ctx.tenantSlug}/assessment-projects/${project.id}/respondents`}
                          >
                            <Users size={14} />
                            Uczestnicy
                          </Link>
                        </Button>

                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                        >
                          <Link
                            href={`/t/${ctx.tenantSlug}/assessment-projects/${project.id}/results`}
                          >
                            <BarChart3 size={14} />
                            Wyniki
                          </Link>
                        </Button>

                        <Button
                          asChild
                          size="sm"
                          className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                        >
                          <Link
                            href={`/dashboard/partner-assessment/${ctx.tenantSlug}/projects/${project.id}`}
                          >
                            Raporty
                          </Link>
                        </Button>

                        <AssessmentProjectRowActions
                          tenantSlug={ctx.tenantSlug}
                          project={project}
                          organizations={organizations}
                          canManage={canUpdate}
                        />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 xl:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1260px] text-left text-sm">
                      <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Projekt</th>
                          <th className="px-4 py-3 font-semibold">
                            Organizacja
                          </th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Start</th>
                          <th className="px-4 py-3 font-semibold">Koniec</th>
                          <th className="px-4 py-3 font-semibold">Opis</th>
                          <th className="px-4 py-3 font-semibold">
                            Aktualizacja
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            Kwestionariusze
                          </th>
                          <th className="px-4 py-3 font-semibold">Akcje</th>
                        </tr>
                      </thead>

                      <tbody>
                        {projects.map((project) => (
                          <tr
                            key={project.id}
                            className="border-b border-black/10 last:border-0"
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold text-[#171717]">
                                {project.name}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {project.clientOrganizationName ?? "—"}
                            </td>

                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className={`rounded-full ${getStatusBadgeClassName(
                                  project.status,
                                )}`}
                              >
                                {getStatusLabel(project.status)}
                              </Badge>
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              {formatDateTime(project.startsAt)}
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              {formatDateTime(project.endsAt)}
                            </td>

                            <td className="max-w-[280px] truncate px-4 py-4 text-[#6b7280]">
                              {project.description ?? "—"}
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 size={13} />
                                {formatDateTime(project.updatedAt)}
                              </span>
                            </td>

                            <td className="px-4 py-4 align-top">
                              <ProjectQuestionnaireList
                                tenantSlug={ctx.tenantSlug}
                                assessmentProjectId={project.id}
                                assignedQuestionnaires={
                                  projectQuestionnairesByProjectId[project.id] ??
                                  []
                                }
                                options={questionnaireOptions}
                                canManage={canUpdate}
                              />
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                                >
                                  <Link
                                    href={`/t/${ctx.tenantSlug}/assessment-projects/${project.id}/respondents`}
                                  >
                                    Uczestnicy
                                  </Link>
                                </Button>

                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                                >
                                  <Link
                                    href={`/t/${ctx.tenantSlug}/assessment-projects/${project.id}/results`}
                                  >
                                    Wyniki
                                  </Link>
                                </Button>

                                <Button
                                  asChild
                                  size="sm"
                                  className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                                >
                                  <Link
                                    href={`/dashboard/partner-assessment/${ctx.tenantSlug}/projects/${project.id}`}
                                  >
                                    Raporty
                                  </Link>
                                </Button>

                                <AssessmentProjectRowActions
                                  tenantSlug={ctx.tenantSlug}
                                  project={project}
                                  organizations={organizations}
                                  canManage={canUpdate}
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
