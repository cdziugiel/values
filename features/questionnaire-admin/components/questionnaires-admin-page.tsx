import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  FileText,
  Layers3,
  Pencil,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { PageHeader } from "@/shared/ui";

import { QuestionnaireRowActions } from "./questionnaire-row-actions";
import { QuestionnaireVersionRowActions } from "./questionnaire-version-row-actions";

import {
  listQuestionnairesAdmin,
  listQuestionnaireVersionsAdmin,
} from "../api/questionnaire-admin.queries";
import { CreateQuestionnaireForm } from "./create-questionnaire-form";
import { CreateQuestionnaireVersionForm } from "./create-questionnaire-version-form";

type QuestionnairesAdminPageProps = {
  showArchivedOnly?: boolean;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function isArchivedStatus(status: string) {
  return status === "archived";
}

function getStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Roboczy";
    case "active":
      return "Aktywny";
    case "archived":
      return "Archiwalny";
    default:
      return status;
  }
}

function getStatusBadgeClassName(status: string) {
  if (status === "active") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "archived") {
    return "border-black/10 bg-[#f3f4f6] text-[#6b7280]";
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

export async function QuestionnairesAdminPage({
  showArchivedOnly = false,
}: QuestionnairesAdminPageProps) {
  await requireSuperAdmin();

  const questionnaires = await listQuestionnairesAdmin();

  const versionsByQuestionnaireId = new Map<
    string,
    Awaited<ReturnType<typeof listQuestionnaireVersionsAdmin>>
  >();

  for (const questionnaire of questionnaires) {
    versionsByQuestionnaireId.set(
      questionnaire.id,
      await listQuestionnaireVersionsAdmin(questionnaire.id),
    );
  }

  const visibleQuestionnaires = questionnaires
    .map((questionnaire) => {
      const allVersions = versionsByQuestionnaireId.get(questionnaire.id) ?? [];

      const visibleVersions = allVersions.filter((version) =>
        showArchivedOnly
          ? isArchivedStatus(version.status)
          : !isArchivedStatus(version.status),
      );

      return {
        questionnaire,
        versions: visibleVersions,
        allVersions,
      };
    })
    .filter(({ questionnaire, versions }) => {
      if (showArchivedOnly) {
        return isArchivedStatus(questionnaire.status) || versions.length > 0;
      }

      return !isArchivedStatus(questionnaire.status);
    });

  const allVersions = Array.from(versionsByQuestionnaireId.values()).flat();

  const activeQuestionnairesCount = questionnaires.filter(
    (questionnaire) => questionnaire.status === "active",
  ).length;

  const draftVersionsCount = allVersions.filter(
    (version) => version.status === "draft",
  ).length;

  const activeVersionsCount = allVersions.filter(
    (version) => version.status === "active",
  ).length;

  const publicVersionsCount = allVersions.filter(
    (version) => version.isPublic,
  ).length;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title={showArchivedOnly ? "Archiwum kwestionariuszy" : "Kwestionariusze"}
          description={
            showArchivedOnly
              ? "Zarchiwizowane narzędzia i wersje kwestionariuszy."
              : "Systemowe definicje narzędzi, wersji, stron, itemów i wymiarów scoringowych."
          }
          actions={
            <BrandButton
              href={
                showArchivedOnly
                  ? "/dashboard/questionnaires"
                  : "/dashboard/questionnaires?archived=1"
              }
              variant={showArchivedOnly ? "primary" : "secondary"}
            >
              {showArchivedOnly ? (
                <ArchiveRestore size={16} />
              ) : (
                <Archive size={16} />
              )}
              {showArchivedOnly ? "Pokaż aktywne" : "Pokaż archiwum"}
            </BrandButton>
          }
        />

        

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Kwestionariusze"
            value={questionnaires.length}
            helper="Wszystkie narzędzia w bibliotece systemowej."
            icon={<FileText size={20} />}
          />

          <MetricCard
            label="Aktywne"
            value={activeQuestionnairesCount}
            helper="Kwestionariusze dostępne do użycia."
            icon={<CheckCircle2 size={20} />}
            progress={percent(activeQuestionnairesCount, questionnaires.length)}
          />

          <MetricCard
            label="Wersje robocze"
            value={draftVersionsCount}
            helper="Wersje możliwe do edycji."
            icon={<Pencil size={20} />}
            progress={percent(draftVersionsCount, allVersions.length)}
          />

          <MetricCard
            label="Opublikowane"
            value={activeVersionsCount}
            helper="Stabilne wersje badawcze."
            icon={<Sparkles size={20} />}
            progress={percent(activeVersionsCount, allVersions.length)}
          />
        </section>

        {!showArchivedOnly ? <CreateQuestionnaireForm /> : null}

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <FileText size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  {showArchivedOnly
                    ? "Zarchiwizowane kwestionariusze"
                    : "Lista kwestionariuszy"}
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Każda karta zawiera definicję narzędzia oraz jego wersje.
                  Szczegóły techniczne są widoczne, ale nie dominują widoku.
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {visibleQuestionnaires.length} pozycji
            </Badge>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {visibleQuestionnaires.length === 0 ? (
              <EmptyPanel>
                {showArchivedOnly
                  ? "Brak zarchiwizowanych kwestionariuszy lub wersji."
                  : "Brak aktywnych kwestionariuszy."}
              </EmptyPanel>
            ) : (
              <div className="space-y-5">
                {visibleQuestionnaires.map(({ questionnaire, versions, allVersions }) => (
                  <article
                    key={questionnaire.id}
                    className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                            {questionnaire.name}
                          </h3>

                          <Badge
                            variant="outline"
                            className={`rounded-full ${getStatusBadgeClassName(
                              questionnaire.status,
                            )}`}
                          >
                            {getStatusLabel(questionnaire.status)}
                          </Badge>

                          <Badge
                            variant="outline"
                            className="rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
                          >
                            {questionnaire.code}
                          </Badge>
                        </div>

                        {questionnaire.description ? (
                          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">
                            {questionnaire.description}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6b7280]">
                          <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1">
                            Wersje: {allVersions.length}
                          </span>

                          <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1">
                            Aktualizacja: {formatDate(questionnaire.updatedAt)}
                          </span>
                        </div>
                      </div>

                      {!showArchivedOnly ? (
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <QuestionnaireRowActions questionnaire={questionnaire} />

                          <CreateQuestionnaireVersionForm
                            questionnaireId={questionnaire.id}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          {showArchivedOnly ? "Zarchiwizowane wersje" : "Wersje"}
                        </h4>

                        <span className="text-xs text-[#8b9099]">
                          {versions.length} widocznych
                        </span>
                      </div>

                      {versions.length === 0 ? (
                        <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm text-[#6b7280]">
                          {showArchivedOnly
                            ? "Brak zarchiwizowanych wersji dla tego kwestionariusza."
                            : "Brak wersji."}
                        </div>
                      ) : (
                        <>
                          <div className="grid gap-3 lg:hidden">
                            {versions.map((version) => (
                              <article
                                key={version.id}
                                className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="font-mono text-xs text-[#6b7280]">
                                      wersja {version.version}
                                    </p>

                                    <h5 className="mt-1 font-semibold tracking-[-0.02em] text-[#171717]">
                                      {version.name}
                                    </h5>
                                  </div>

                                  <div className="flex flex-wrap justify-end gap-2">
                                    <Badge
                                      variant="outline"
                                      className={`rounded-full ${getStatusBadgeClassName(
                                        version.status,
                                      )}`}
                                    >
                                      {getStatusLabel(version.status)}
                                    </Badge>

                                    {version.isPublic ? (
                                      <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                                        publiczna
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>

                                <p className="mt-3 text-xs text-[#8b9099]">
                                  Aktualizacja: {formatDate(version.updatedAt)}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    asChild
                                    size="sm"
                                    className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                                  >
                                    <Link
                                      href={`/dashboard/questionnaires/editor/${version.id}`}
                                    >
                                      Edytuj treść
                                    </Link>
                                  </Button>

                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                                  >
                                    <Link
                                      href={`/dashboard/questionnaires/preview/${version.id}`}
                                    >
                                      Podgląd
                                    </Link>
                                  </Button>

                                  {!showArchivedOnly ? (
                                    <QuestionnaireVersionRowActions
                                      version={version}
                                    />
                                  ) : null}
                                </div>
                              </article>
                            ))}
                          </div>

                          <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 lg:block">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                                  <tr>
                                    <th className="px-4 py-3 font-semibold">
                                      Wersja
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                      Nazwa
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                      Status
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                      Aktualizacja
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                      Akcje
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {versions.map((version) => (
                                    <tr
                                      key={version.id}
                                      className="border-b border-black/10 last:border-0"
                                    >
                                      <td className="px-4 py-4 font-mono text-xs text-[#171717]">
                                        {version.version}
                                      </td>

                                      <td className="px-4 py-4 text-[#171717]">
                                        {version.name}
                                      </td>

                                      <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                          <Badge
                                            variant="outline"
                                            className={`rounded-full ${getStatusBadgeClassName(
                                              version.status,
                                            )}`}
                                          >
                                            {getStatusLabel(version.status)}
                                          </Badge>

                                          {version.isPublic ? (
                                            <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                                              publiczna
                                            </Badge>
                                          ) : null}
                                        </div>
                                      </td>

                                      <td className="px-4 py-4 text-[#6b7280]">
                                        {formatDate(version.updatedAt)}
                                      </td>

                                      <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                          <Button
                                            asChild
                                            size="sm"
                                            className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                                          >
                                            <Link
                                              href={`/dashboard/questionnaires/editor/${version.id}`}
                                            >
                                              Edytuj treść
                                            </Link>
                                          </Button>

                                          <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                                          >
                                            <Link
                                              href={`/dashboard/questionnaires/preview/${version.id}`}
                                            >
                                              Podgląd
                                            </Link>
                                          </Button>

                                          {!showArchivedOnly ? (
                                            <QuestionnaireVersionRowActions
                                              version={version}
                                            />
                                          ) : null}
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
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}