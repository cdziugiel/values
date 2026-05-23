// features/assessment-results/components/assessment-project-results-page.tsx

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Layers3,
  ListChecks,
  PieChart,
  Table2,
  Users,
} from "lucide-react";
import { AssessmentDimensionExplorer } from "./assessment-dimension-explorer";

import { getAssessmentProjectResults } from "../api/assessment-project-results.queries";

type AssessmentProjectResultsPageProps = {
  tenantSlug: string;
  assessmentProjectId: string;
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

function sessionStatusLabel(status: string) {
  if (status === "completed") return "Ukończona";
  if (status === "in_progress") return "W trakcie";
  if (status === "expired") return "Wygasła";
  if (status === "abandoned") return "Przerwana";
  if (status === "not_started") return "Nierozpoczęta";

  return status;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function statusLabel(status: string) {
  if (status === "draft") return "Szkic";
  if (status === "active") return "Aktywne";
  if (status === "closed") return "Zamknięte";
  if (status === "archived") return "Zarchiwizowane";

  return status;
}

function statusBadgeClassName(status: string) {
  if (status === "completed" || status === "active") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "in_progress") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "expired" || status === "abandoned" || status === "archived") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function groupBy<T>(
  items: T[],
  getKey: (item: T) => string,
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
}

function BrandLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#171717] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          : "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 text-sm font-semibold text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      }
    >
      {children}
    </Link>
  );
}

function BadgePill({
  children,
  className = "border-black/10 bg-white/70 text-[#6b7280]",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
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
  value: ReactNode;
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

function SectionCard({
  icon,
  title,
  description,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] hv-brand-card">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            {icon}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
              {title}
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6b7280]">
              {description}
            </p>
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>
    </section>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280] shadow-sm">
      {children}
    </div>
  );
}

function DataTable({
  minWidth,
  children,
}: {
  minWidth: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
      <div className="overflow-x-auto">
        <table className={`w-full ${minWidth} text-left text-sm`}>{children}</table>
      </div>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
      {children}
    </thead>
  );
}

function GroupCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[1.75rem] border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur">
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-[#6b7280]">{subtitle}</p>
      </div>

      <div className="mt-4">{children}</div>
    </article>
  );
}

export async function AssessmentProjectResultsPage({
  tenantSlug,
  assessmentProjectId,
}: AssessmentProjectResultsPageProps) {
  const data = await getAssessmentProjectResults({
    tenantSlug,
    assessmentProjectId,
  });

  if (!data) {
    return (
      <main className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Nie znaleziono projektu
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
              Nie znaleziono projektu badawczego dla wskazanego partnera.
            </p>

            <div className="mt-5">
              <BrandLink href={`/t/${tenantSlug}/assessment-projects`}>
                <ArrowLeft size={16} />
                Wróć do projektów
              </BrandLink>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const dimensionGroups = Object.entries(
    groupBy(
      data.dimensionAggregates,
      (aggregate) => aggregate.questionnaireVersionId,
    ),
  ).map(([questionnaireVersionId, aggregates]) => ({
    questionnaireVersionId,
    questionnaireName: aggregates[0]?.questionnaireName ?? "Kwestionariusz",
    questionnaireVersionName:
      aggregates[0]?.questionnaireVersionName ?? "Wersja",
    aggregates,
  }));

  const respondentMatrixGroups = dimensionGroups.map((group) => {
    const dimensions = group.aggregates.map((aggregate) => ({
      dimensionId: aggregate.dimensionId,
      dimensionCode: aggregate.dimensionCode,
      dimensionName: aggregate.dimensionName,
    }));

    return {
      questionnaireVersionId: group.questionnaireVersionId,
      questionnaireName: group.questionnaireName,
      questionnaireVersionName: group.questionnaireVersionName,
      dimensions,
      respondents: data.respondentResults.map((respondent) => {
        const scoresForQuestionnaire = respondent.scores.filter(
          (score) => score.questionnaireVersionId === group.questionnaireVersionId,
        );

        const scoreByDimensionId = new Map(
          scoresForQuestionnaire.map((score) => [score.dimensionId, score]),
        );

        const completenessValues = scoresForQuestionnaire.map(
          (score) => score.completeness,
        );

        const averageCompleteness =
          completenessValues.length > 0
            ? completenessValues.reduce((acc, value) => acc + value, 0) /
              completenessValues.length
            : null;

        return {
          ...respondent,
          scoreByDimensionId,
          averageCompleteness,
        };
      }),
    };
  });

  const categoricalGroups = Object.entries(
    groupBy(
      data.categoricalAggregates,
      (item) => item.questionnaireVersionId,
    ),
  ).map(([questionnaireVersionId, items]) => ({
    questionnaireVersionId,
    questionnaireName: items[0]?.questionnaireName ?? "Kwestionariusz",
    questionnaireVersionName: items[0]?.questionnaireVersionName ?? "Wersja",
    items,
  }));

  const completionRate = percent(
    data.summary.completedSessionsCount,
    data.summary.sessionsCount,
  );

  return (
    <main className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <BarChart3 size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Wyniki projektu
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                  {data.project.name}
                </h1>

                <BadgePill className={statusBadgeClassName(data.project.status)}>
                  {statusLabel(data.project.status)}
                </BadgePill>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
                <span>Partner:</span>
                <span className="font-mono text-[#171717]">{data.tenant.slug}</span>
              </div>

              {data.project.description ? (
                <p className="mt-5 max-w-3xl text-base leading-8 text-[#6b7280]">
                  {data.project.description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 md:min-w-56">
              <BrandLink
                href={`/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/results/export?format=xlsx`}
                variant="primary"
              >
                <FileSpreadsheet size={16} />
                Eksport XLSX
              </BrandLink>

              <BrandLink href={`/t/${tenantSlug}/assessment-projects`}>
                <ArrowLeft size={16} />
                Wróć do projektów
              </BrandLink>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-3 md:p-8">
            <BrandLink
              href={`/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/results/export?format=csv&dataset=dimensions`}
            >
              <Download size={15} />
              CSV wymiary
            </BrandLink>

            <BrandLink
              href={`/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/results/export?format=csv&dataset=respondents`}
            >
              <Download size={15} />
              CSV respondenci
            </BrandLink>

            <BrandLink
              href={`/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/results/export?format=csv&dataset=categorical`}
            >
              <Download size={15} />
              CSV kategorie
            </BrandLink>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Wszystkie sesje"
            value={data.summary.sessionsCount}
            helper="Łączna liczba sesji w projekcie."
            icon={<Users size={20} />}
          />

          <StatCard
            label="Ukończone"
            value={data.summary.completedSessionsCount}
            helper="Sesje gotowe do agregacji wyników."
            icon={<CheckCircle2 size={20} />}
            progress={completionRate}
          />

          <StatCard
            label="W trakcie"
            value={data.summary.inProgressSessionsCount}
            helper="Respondenci, którzy rozpoczęli badanie."
            icon={<ListChecks size={20} />}
            progress={percent(
              data.summary.inProgressSessionsCount,
              data.summary.sessionsCount,
            )}
          />

          <StatCard
            label="Nierozpoczęte"
            value={data.summary.notStartedSessionsCount}
            helper="Sesje oczekujące na rozpoczęcie."
            icon={<Layers3 size={20} />}
            progress={percent(
              data.summary.notStartedSessionsCount,
              data.summary.sessionsCount,
            )}
          />
        </section>

<AssessmentDimensionExplorer
  aggregates={data.dimensionAggregates}
  crossCategoryResults={data.crossCategoryResults}
/>

        <SectionCard
          icon={<Table2 size={20} />}
          title="Macierz wyników respondentów"
          description="Wyniki wymiarów dla poszczególnych respondentów. Wartości w komórkach pokazują średnią ważoną itemów dla danego wymiaru."
        >
          {respondentMatrixGroups.length === 0 ? (
            <EmptyPanel>
              Brak danych do macierzy respondentów. Upewnij się, że sesje są
              ukończone i przeliczone.
            </EmptyPanel>
          ) : (
            <div className="space-y-6">
              {respondentMatrixGroups.map((group) => (
                <GroupCard
                  key={group.questionnaireVersionId}
                  title={group.questionnaireName}
                  subtitle={group.questionnaireVersionName}
                >
                  <DataTable minWidth="min-w-[1120px]">
                    <TableHead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-[#f7f7f8] px-4 py-3 font-semibold">
                          Respondent
                        </th>
                        <th className="px-4 py-3 font-semibold">Status</th>

                        {group.dimensions.map((dimension) => (
                          <th
                            key={dimension.dimensionId}
                            className="px-4 py-3 text-right font-semibold"
                            title={dimension.dimensionName}
                          >
                            {dimension.dimensionCode}
                          </th>
                        ))}

                        <th className="px-4 py-3 text-right font-semibold">
                          Kompletność
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Akcje
                        </th>
                      </tr>
                    </TableHead>

                    <tbody>
                      {group.respondents.map((respondent) => (
                        <tr
                          key={`${group.questionnaireVersionId}:${respondent.sessionId}`}
                          className="border-b border-black/10 last:border-0"
                        >
                          <td className="sticky left-0 z-10 bg-white px-4 py-4">
                            <div className="font-semibold text-[#171717]">
                              {respondent.respondentName}
                            </div>

                            {respondent.respondentEmail ? (
                              <div className="mt-0.5 text-xs text-[#6b7280]">
                                {respondent.respondentEmail}
                              </div>
                            ) : respondent.respondentExternalCode ? (
                              <div className="mt-0.5 text-xs text-[#6b7280]">
                                {respondent.respondentExternalCode}
                              </div>
                            ) : null}
                          </td>

                          <td className="px-4 py-4">
                            <BadgePill
                              className={statusBadgeClassName(
                                respondent.sessionStatus,
                              )}
                            >
                              {sessionStatusLabel(respondent.sessionStatus)}
                            </BadgePill>
                          </td>

                          {group.dimensions.map((dimension) => {
                            const score = respondent.scoreByDimensionId.get(
                              dimension.dimensionId,
                            );

                            return (
                              <td
                                key={dimension.dimensionId}
                                className="px-4 py-4 text-right text-[#171717]"
                                title={dimension.dimensionName}
                              >
                                {score
                                  ? formatNumber(score.weightedMeanScore)
                                  : "—"}
                              </td>
                            );
                          })}

                          <td className="px-4 py-4 text-right text-[#171717]">
                            {formatPercent(respondent.averageCompleteness)}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <BrandLink
                                href={`/t/${tenantSlug}/assessment-sessions/${respondent.sessionId}/results`}
                              >
                                Wynik
                              </BrandLink>

                              {respondent.reportHref ? (
                                <BrandLink href={respondent.reportHref} variant="primary">
                                  Raport
                                </BrandLink>
                              ) : (
                                <span className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white/60 px-4 text-sm text-[#6b7280]">
                                  Brak raportu
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>

                  <div className="mt-4 grid gap-2 text-xs text-[#6b7280] md:grid-cols-2">
                    {group.dimensions.map((dimension) => (
                      <div key={dimension.dimensionId}>
                        <span className="font-mono text-[#171717]">
                          {dimension.dimensionCode}
                        </span>
                        {" — "}
                        {dimension.dimensionName}
                      </div>
                    ))}
                  </div>
                </GroupCard>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon={<PieChart size={20} />}
          title="Rozkłady odpowiedzi bez scoringu"
          description="Odpowiedzi typu single choice / multiple choice bez przypisanego score są zliczane jako dane kategoryczne."
        >
          {data.categoricalAggregates.length === 0 ? (
            <EmptyPanel>
              Brak itemów kategorycznych bez scoringu albo brak odpowiedzi dla
              takich itemów.
            </EmptyPanel>
          ) : (
            <div className="space-y-6">
              {categoricalGroups.map((group) => {
                const itemsByPage = Object.entries(
                  groupBy(
                    group.items,
                    (item) => item.pageTitle ?? "Bez strony",
                  ),
                );

                return (
                  <GroupCard
                    key={group.questionnaireVersionId}
                    title={group.questionnaireName}
                    subtitle={group.questionnaireVersionName}
                  >
                    <div className="space-y-5">
                      {itemsByPage.map(([pageTitle, pageItems]) => (
                        <div key={pageTitle} className="space-y-4">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                            {pageTitle}
                          </h4>

                          {pageItems.map((item) => (
                            <article
                              key={item.itemId}
                              className="rounded-[1.5rem] border border-black/10 bg-white/75 p-5 shadow-sm"
                            >
                              <div>
                                <h5 className="font-semibold tracking-[-0.02em] text-[#171717]">
                                  {item.itemText}
                                </h5>

                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6b7280]">
                                  <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 font-mono">
                                    {item.itemCode}
                                  </span>
                                  <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1">
                                    {item.itemType}
                                  </span>
                                  <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1">
                                    odpowiedzi: {item.totalAnswersCount}
                                  </span>
                                </div>
                              </div>

                              {item.options.length === 0 ? (
                                <div className="mt-4 rounded-[1.25rem] border border-dashed border-black/10 bg-white/60 p-4 text-sm text-[#6b7280]">
                                  Brak odpowiedzi.
                                </div>
                              ) : (
                                <div className="mt-4">
                                  <DataTable minWidth="min-w-[620px]">
                                    <TableHead>
                                      <tr>
                                        <th className="px-4 py-3 font-semibold">
                                          Odpowiedź
                                        </th>
                                        <th className="px-4 py-3 text-right font-semibold">
                                          Liczba
                                        </th>
                                        <th className="px-4 py-3 text-right font-semibold">
                                          Udział
                                        </th>
                                      </tr>
                                    </TableHead>

                                    <tbody>
                                      {item.options.map((option) => (
                                        <tr
                                          key={option.value}
                                          className="border-b border-black/10 last:border-0"
                                        >
                                          <td className="px-4 py-4 text-[#171717]">
                                            {option.label}
                                          </td>
                                          <td className="px-4 py-4 text-right text-[#171717]">
                                            {option.count}
                                          </td>
                                          <td className="px-4 py-4 text-right text-[#171717]">
                                            {formatPercent(option.percentage)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </DataTable>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      ))}
                    </div>
                  </GroupCard>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
