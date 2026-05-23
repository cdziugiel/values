// features/assessment-results/components/assessment-session-results-page.tsx

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers3,
  ListChecks,
  ShieldCheck,
  Table2,
  TriangleAlert,
} from "lucide-react";

import { getAssessmentSessionResults } from "../api/assessment-session-results.queries";
import { RecalculateAssessmentSessionScoresForm } from "./recalculate-assessment-session-scores-form";

type AssessmentSessionResultsPageProps = {
  tenantSlug: string;
  sessionId: string;
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

function formatDateTime(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusLabel(status: string) {
  if (status === "completed") return "Zakończona";
  if (status === "in_progress") return "W trakcie";
  if (status === "not_started") return "Nierozpoczęta";

  return status;
}

function statusBadgeClassName(status: string) {
  if (status === "completed") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "in_progress") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "not_started") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
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

function MetricCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
            {label}
          </p>

          <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#171717]">
            {value}
          </div>

          {helper ? (
            <div className="mt-1 text-xs leading-5 text-[#6b7280]">{helper}</div>
          ) : null}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
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

function DiagnosticStatusBadge({
  responseExists,
  numericScore,
}: {
  responseExists: boolean;
  numericScore: number | null;
}) {
  if (!responseExists) {
    return (
      <BadgePill className="border-amber-200 bg-amber-50 text-amber-700">
        Brak odpowiedzi
      </BadgePill>
    );
  }

  if (numericScore === null) {
    return (
      <BadgePill className="border-black/10 bg-white/70 text-[#6b7280]">
        Bez wyniku liczbowego
      </BadgePill>
    );
  }

  return (
    <BadgePill className="border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
      Liczony
    </BadgePill>
  );
}

export async function AssessmentSessionResultsPage({
  tenantSlug,
  sessionId,
}: AssessmentSessionResultsPageProps) {
  const data = await getAssessmentSessionResults({
    tenantSlug,
    sessionId,
  });

  if (!data) {
    return (
      <main className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Nie znaleziono wyników
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
              Nie znaleziono sesji badania dla wskazanego partnera albo sesja
              została usunięta.
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

  return (
    <main className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <BarChart3 size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Wyniki sesji
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                  {data.respondent.displayName}
                </h1>

                <BadgePill className={statusBadgeClassName(data.session.status)}>
                  {statusLabel(data.session.status)}
                </BadgePill>
              </div>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Projekt:{" "}
                <span className="font-semibold text-[#171717]">
                  {data.project.name}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 md:min-w-56">
              {data.reportHref ? (
                <BrandLink href={data.reportHref} variant="primary">
                  <FileText size={16} />
                  Zobacz raport
                </BrandLink>
              ) : null}

              <BrandLink
                href={`/t/${tenantSlug}/assessment-projects/${data.project.id}/respondents`}
              >
                <ArrowLeft size={16} />
                Wróć do respondentów
              </BrandLink>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-4 md:p-8">
            <MetricCard
              label="Status sesji"
              value={statusLabel(data.session.status)}
              icon={<ShieldCheck size={18} />}
            />

            <MetricCard
              label="Respondent"
              value={data.respondent.displayName}
              helper={data.respondent.email}
              icon={<ClipboardList size={18} />}
            />

            <MetricCard
              label="Zakończono"
              value={formatDateTime(data.session.completedAt)}
              icon={<CheckCircle2 size={18} />}
            />

            <MetricCard
              label="Liczba wyników"
              value={data.scores.length}
              icon={<Layers3 size={18} />}
            />
          </div>
        </section>

        <SectionCard
          icon={<BarChart3 size={20} />}
          title="Wyniki wymiarów"
          description="Wyniki przeliczone na podstawie odpowiedzi respondenta i przypisań scoringowych itemów."
          action={
            <RecalculateAssessmentSessionScoresForm
              tenantSlug={tenantSlug}
              sessionId={sessionId}
            />
          }
        >
          {data.scores.length === 0 ? (
            <EmptyPanel>
              Brak zapisanych wyników wymiarów. Jeżeli sesja została zakończona
              przed dodaniem scoringu, uruchom ponowne przeliczenie wyników albo
              zakończ nową sesję testową.
            </EmptyPanel>
          ) : (
            <DataTable minWidth="min-w-[980px]">
              <TableHead>
                <tr>
                  <th className="px-4 py-3 font-semibold">Kod</th>
                  <th className="px-4 py-3 font-semibold">Wymiar</th>
                  <th className="px-4 py-3 text-right font-semibold">Wynik surowy</th>
                  <th className="px-4 py-3 text-right font-semibold">Wynik ważony</th>
                  <th className="px-4 py-3 text-right font-semibold">Średnia</th>
                  <th className="px-4 py-3 text-right font-semibold">Średnia ważona</th>
                  <th className="px-4 py-3 text-right font-semibold">Odpowiedzi</th>
                  <th className="px-4 py-3 text-right font-semibold">Oczekiwane</th>
                  <th className="px-4 py-3 text-right font-semibold">Kompletność</th>
                </tr>
              </TableHead>

              <tbody>
                {data.scores.map((score) => (
                  <tr key={score.id} className="border-b border-black/10 last:border-0">
                    <td className="px-4 py-4 font-mono text-xs text-[#6b7280]">
                      {score.dimensionCode}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[#171717]">
                      {score.dimensionName}
                    </td>
                    <td className="px-4 py-4 text-right text-[#171717]">
                      {formatNumber(score.rawScore)}
                    </td>
                    <td className="px-4 py-4 text-right text-[#171717]">
                      {formatNumber(score.weightedScore)}
                    </td>
                    <td className="px-4 py-4 text-right text-[#171717]">
                      {formatNumber(score.meanScore)}
                    </td>
                    <td className="px-4 py-4 text-right text-[#171717]">
                      {formatNumber(score.weightedMeanScore)}
                    </td>
                    <td className="px-4 py-4 text-right text-[#171717]">
                      {formatNumber(score.answeredItemsCount)}
                    </td>
                    <td className="px-4 py-4 text-right text-[#171717]">
                      {formatNumber(score.expectedItemsCount)}
                    </td>
                    <td className="px-4 py-4 text-right text-[#171717]">
                      {formatPercent(score.completeness)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>

        <SectionCard
          icon={<Table2 size={20} />}
          title="Odpowiedzi i scoring itemów"
          description="Widok techniczny pokazujący, jak odpowiedzi respondenta zostały przeliczone na wartości scoringowe."
        >
          {data.responseDiagnostics.length === 0 ? (
            <EmptyPanel>Brak itemów diagnostycznych dla tej sesji.</EmptyPanel>
          ) : (
            <DataTable minWidth="min-w-[1400px]">
              <TableHead>
                <tr>
                  <th className="px-4 py-3 font-semibold">Kwestionariusz</th>
                  <th className="px-4 py-3 font-semibold">Strona</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Typ</th>
                  <th className="px-4 py-3 font-semibold">Odpowiedź</th>
                  <th className="px-4 py-3 text-right font-semibold">Wynik bazowy</th>
                  <th className="px-4 py-3 font-semibold">Wymiary</th>
                  <th className="px-4 py-3 font-semibold">Reverse</th>
                  <th className="px-4 py-3 font-semibold">Waga</th>
                  <th className="px-4 py-3 text-right font-semibold">Wynik po reverse</th>
                  <th className="px-4 py-3 text-right font-semibold">Wynik ważony</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </TableHead>

              <tbody>
                {data.responseDiagnostics.map((item) => {
                  if (item.dimensions.length === 0) {
                    return (
                      <tr key={item.itemId} className="border-b border-black/10 last:border-0">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-[#171717]">
                            {item.questionnaireName}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            {item.questionnaireVersionName}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-[#171717]">
                          {item.pageTitle ?? "—"}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-[#171717]">{item.itemText}</div>
                          <div className="font-mono text-xs text-[#6b7280]">
                            {item.itemCode}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-[#171717]">{item.itemType}</td>
                        <td className="px-4 py-4 text-[#171717]">{item.responseDisplayValue}</td>
                        <td className="px-4 py-4 text-right text-[#171717]">
                          {formatNumber(item.numericScore)}
                        </td>
                        <td className="px-4 py-4 text-[#6b7280]">—</td>
                        <td className="px-4 py-4 text-[#6b7280]">—</td>
                        <td className="px-4 py-4 text-[#6b7280]">—</td>
                        <td className="px-4 py-4 text-right text-[#6b7280]">—</td>
                        <td className="px-4 py-4 text-right text-[#6b7280]">—</td>
                        <td className="px-4 py-4">
                          <BadgePill className="border-black/10 bg-white/70 text-[#6b7280]">
                            Brak wymiaru
                          </BadgePill>
                        </td>
                      </tr>
                    );
                  }

                  return item.dimensions.map((dimension, dimensionIndex) => (
                    <tr
                      key={`${item.itemId}:${dimension.scoreConfigId}`}
                      className="border-b border-black/10 last:border-0"
                    >
                      {dimensionIndex === 0 ? (
                        <>
                          <td rowSpan={item.dimensions.length} className="px-4 py-4 align-top">
                            <div className="font-semibold text-[#171717]">
                              {item.questionnaireName}
                            </div>
                            <div className="text-xs text-[#6b7280]">
                              {item.questionnaireVersionName}
                            </div>
                          </td>

                          <td rowSpan={item.dimensions.length} className="px-4 py-4 align-top text-[#171717]">
                            {item.pageTitle ?? "—"}
                          </td>

                          <td rowSpan={item.dimensions.length} className="px-4 py-4 align-top">
                            <div className="font-semibold text-[#171717]">{item.itemText}</div>
                            <div className="font-mono text-xs text-[#6b7280]">
                              {item.itemCode}
                            </div>
                          </td>

                          <td rowSpan={item.dimensions.length} className="px-4 py-4 align-top text-[#171717]">
                            {item.itemType}
                          </td>

                          <td rowSpan={item.dimensions.length} className="px-4 py-4 align-top text-[#171717]">
                            {item.responseDisplayValue}
                          </td>

                          <td rowSpan={item.dimensions.length} className="px-4 py-4 text-right align-top text-[#171717]">
                            {formatNumber(item.numericScore)}
                          </td>
                        </>
                      ) : null}

                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#171717]">
                          {dimension.dimensionName}
                        </div>
                        <div className="font-mono text-xs text-[#6b7280]">
                          {dimension.dimensionCode}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-[#171717]">
                        {dimension.reverseScored ? "tak" : "nie"}
                      </td>

                      <td className="px-4 py-4 text-[#171717]">
                        {dimension.weight ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-right text-[#171717]">
                        {formatNumber(dimension.numericScoreAfterReverse)}
                      </td>

                      <td className="px-4 py-4 text-right text-[#171717]">
                        {formatNumber(dimension.weightedScore)}
                      </td>

                      <td className="px-4 py-4">
                        <DiagnosticStatusBadge
                          responseExists={item.responseExists}
                          numericScore={item.numericScore}
                        />
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </DataTable>
          )}
        </SectionCard>

        <section className="rounded-[2rem] border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <TriangleAlert size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                Uwagi diagnostyczne
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
                Ten widok jest techniczno-diagnostyczny. Służy do sprawdzenia,
                czy scoring działa poprawnie. Nie jest finalnym raportem
                psychologicznym ani raportem dla respondenta.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
