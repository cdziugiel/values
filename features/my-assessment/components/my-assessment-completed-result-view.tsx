// features/my-assessment/components/my-assessment-completed-result-view.tsx

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { RedeemReportAccessCodeForm } from "@/features/report-access/components/redeem-report-access-code-form";

import { getMyAssessmentReportAccessState } from "../api/my-assessment-report-link.queries";

type CompletedAssessmentScore = {
  id?: string | null;

  dimensionId?: string | null;
  dimensionCode?: string | null;
  dimensionName?: string | null;

  category?: string | null;
  categoryLabel?: string | null;
  categoryOrderIndex?: number | string | null;

  dimensionCategory?: string | null;
  dimensionCategoryLabel?: string | null;
  dimensionCategoryOrderIndex?: number | string | null;

  orderIndex?: number | string | null;
  dimensionOrderIndex?: number | string | null;

  meanScore?: unknown;
  weightedMeanScore?: unknown;
  completeness?: unknown;
};

type CompletedAssessmentResponse = {
  itemId?: string | null;
  itemText?: string | null;

  pageId?: string | null;
  pageCode?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
  pageOrderIndex?: number | string | null;

  itemOrderIndex?: number | string | null;
  orderIndex?: number | string | null;

  responseExists?: boolean | null;
  responseDisplayValue?: string | number | boolean | null;
};

type CompletedAssessmentPayload = {
  frozenAt?: string | Date | null;
  project?: {
    name?: string | null;
  } | null;
  scores?: CompletedAssessmentScore[] | null;
  responses?: CompletedAssessmentResponse[] | null;
};

type MyAssessmentCompletedResultViewProps = {
  result: {
    tenantSlug: string;
    sessionId: string;
    payload: CompletedAssessmentPayload | null;
    projectQuestionnaireId?: string | null;
    questionnaireVersionId?: string | null;
  };
};

type ScoreCategoryGroup = {
  key: string;
  label: string;
  orderIndex: number;
  scores: CompletedAssessmentScore[];
};

type ResponsePageGroup = {
  key: string;
  title: string;
  description: string | null;
  orderIndex: number;
  responses: CompletedAssessmentResponse[];
};

const DEFAULT_CATEGORY_KEY = "__NO_CATEGORY__";
const DEFAULT_CATEGORY_LABEL = "Pozostałe";
const FALLBACK_ORDER_INDEX = Number.MAX_SAFE_INTEGER;

function formatDateTime(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPercent(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return `${Math.round(numberValue * 100)}%`;
}

function formatNumber(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return Number(numberValue.toFixed(2)).toString();
}

function normalizePercent(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numberValue * 100)));
}

function numberOrFallback(value: unknown, fallback = FALLBACK_ORDER_INDEX) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function stringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized : null;
}

function compareText(left: unknown, right: unknown) {
  return String(left ?? "").localeCompare(String(right ?? ""), "pl", {
    sensitivity: "base",
    numeric: true,
  });
}

function getScoreCategoryKey(score: CompletedAssessmentScore) {
  return (
    stringOrNull(score.dimensionCategory) ??
    stringOrNull(score.category) ??
    DEFAULT_CATEGORY_KEY
  );
}

function getScoreCategoryLabel(score: CompletedAssessmentScore) {
  return (
    stringOrNull(score.dimensionCategoryLabel) ??
    stringOrNull(score.categoryLabel) ??
    stringOrNull(score.dimensionCategory) ??
    stringOrNull(score.category) ??
    DEFAULT_CATEGORY_LABEL
  );
}

function getScoreCategoryOrderIndex(score: CompletedAssessmentScore) {
  return Math.min(
    numberOrFallback(score.dimensionCategoryOrderIndex),
    numberOrFallback(score.categoryOrderIndex),
  );
}

function getScoreDimensionOrderIndex(score: CompletedAssessmentScore) {
  return Math.min(
    numberOrFallback(score.dimensionOrderIndex),
    numberOrFallback(score.orderIndex),
  );
}

function sortScores(scores: CompletedAssessmentScore[]) {
  return [...scores].sort((left, right) => {
    const orderDiff =
      getScoreDimensionOrderIndex(left) - getScoreDimensionOrderIndex(right);

    if (orderDiff !== 0) {
      return orderDiff;
    }

    const codeDiff = compareText(left.dimensionCode, right.dimensionCode);

    if (codeDiff !== 0) {
      return codeDiff;
    }

    return compareText(left.dimensionName, right.dimensionName);
  });
}

function groupScoresByCategory(
  scores: CompletedAssessmentScore[],
): ScoreCategoryGroup[] {
  const groups = new Map<string, ScoreCategoryGroup>();

  for (const score of scores) {
    const key = getScoreCategoryKey(score);
    const label = getScoreCategoryLabel(score);
    const orderIndex = getScoreCategoryOrderIndex(score);

    const existing = groups.get(key);

    if (existing) {
      existing.scores.push(score);
      existing.orderIndex = Math.min(existing.orderIndex, orderIndex);
    } else {
      groups.set(key, {
        key,
        label,
        orderIndex,
        scores: [score],
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      scores: sortScores(group.scores),
    }))
    .sort((left, right) => {
      if (left.orderIndex !== right.orderIndex) {
        return left.orderIndex - right.orderIndex;
      }

      return compareText(left.label, right.label);
    });
}

function getResponsePageKey(response: CompletedAssessmentResponse) {
  return (
    stringOrNull(response.pageId) ??
    stringOrNull(response.pageCode) ??
    stringOrNull(response.pageTitle) ??
    "__NO_PAGE__"
  );
}

function getResponsePageTitle(response: CompletedAssessmentResponse) {
  return stringOrNull(response.pageTitle) ?? "Pozostałe odpowiedzi";
}

function getResponsePageDescription(response: CompletedAssessmentResponse) {
  return stringOrNull(response.pageDescription);
}

function getResponsePageOrderIndex(response: CompletedAssessmentResponse) {
  return numberOrFallback(response.pageOrderIndex);
}

function getResponseItemOrderIndex(
  response: CompletedAssessmentResponse,
  fallbackIndex: number,
) {
  return Math.min(
    numberOrFallback(response.itemOrderIndex),
    numberOrFallback(response.orderIndex),
    fallbackIndex,
  );
}

function groupResponsesByPage(
  responses: CompletedAssessmentResponse[],
): ResponsePageGroup[] {
  const groups = new Map<string, ResponsePageGroup>();

  responses.forEach((response, index) => {
    const key = getResponsePageKey(response);
    const title = getResponsePageTitle(response);
    const description = getResponsePageDescription(response);
    const orderIndex = getResponsePageOrderIndex(response);

    const responseWithFallbackOrder = {
      ...response,
      orderIndex: response.orderIndex ?? response.itemOrderIndex ?? index,
    };

    const existing = groups.get(key);

    if (existing) {
      existing.responses.push(responseWithFallbackOrder);

      if (!existing.description && description) {
        existing.description = description;
      }

      existing.orderIndex = Math.min(existing.orderIndex, orderIndex);
    } else {
      groups.set(key, {
        key,
        title,
        description,
        orderIndex,
        responses: [responseWithFallbackOrder],
      });
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      responses: [...group.responses].sort((left, right) => {
        const leftOrder = getResponseItemOrderIndex(left, 0);
        const rightOrder = getResponseItemOrderIndex(right, 0);

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return compareText(left.itemText, right.itemText);
      }),
    }))
    .sort((left, right) => {
      if (left.orderIndex !== right.orderIndex) {
        return left.orderIndex - right.orderIndex;
      }

      return compareText(left.title, right.title);
    });
}

function getScoreKey(score: CompletedAssessmentScore, index: number) {
  return (
    score.id ??
    score.dimensionId ??
    score.dimensionCode ??
    `score-${index}`
  );
}

function getResponseKey(response: CompletedAssessmentResponse, index: number) {
  return response.itemId ?? `response-${index}`;
}

function BrandLinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/50"
      : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 text-sm font-semibold text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/50";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
            {label}
          </p>
          <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#171717]">
            {value}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <header className="rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
          {icon}
        </div>

        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
            {eyebrow}
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            {description}
          </p>
        </div>
      </div>
    </header>
  );
}

function EmptyPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

function ScoreCard({
  score,
  index,
}: {
  score: CompletedAssessmentScore;
  index: number;
}) {
  const completenessPercent = normalizePercent(score.completeness);

  return (
    <article className="group relative overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b9099]">
            {score.dimensionCode ?? `Wymiar ${index + 1}`}
          </p>

          <h4 className="mt-1 text-base font-semibold leading-6 tracking-[-0.02em] text-[#171717]">
            {score.dimensionName ?? "Nieopisany wymiar"}
          </h4>
        </div>

        <div className="shrink-0 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-sm font-semibold text-[#0f766e]">
          {formatNumber(score.weightedMeanScore)}
        </div>
      </div>


      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-[#6b7280]">Kompletność</span>
          <span className="font-semibold text-[#171717]">
            {formatPercent(score.completeness)}
          </span>
        </div>

        <div
          className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]"
            style={{ width: `${completenessPercent}%` }}
          />
        </div>
      </div>
    </article>
  );
}

export async function MyAssessmentCompletedResultView({
  result,
}: MyAssessmentCompletedResultViewProps) {
  const payload = result.payload;

const reportAccess = await getMyAssessmentReportAccessState({
  tenantSlug: result.tenantSlug,
  sessionId: result.sessionId,
  projectQuestionnaireId: result.projectQuestionnaireId ?? null,
  questionnaireVersionId: result.questionnaireVersionId ?? null,
});

  const scores = Array.isArray(payload?.scores) ? payload.scores : [];
  const scoreGroups = groupScoresByCategory(scores);

  const responses = Array.isArray(payload?.responses) ? payload.responses : [];
  const responseGroups = groupResponsesByPage(responses);

  const answeredCount = responses.filter(
    (response) => response.responseExists,
  ).length;

  const totalCount = responses.length;
  const responseCompletionPercent =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <main className="min-h-screen hv-brand-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <CheckCircle2 size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  HUMANET VALUES
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                Badanie zostało zakończone.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Poniżej znajduje się zapisane podsumowanie sesji. Raport, jeżeli
                jest dostępny, możesz otworzyć bezpośrednio z tego miejsca.
              </p>
            </div>

            <div className="flex flex-col gap-2 md:min-w-56">
              {reportAccess.reportHref ? (
                <BrandLinkButton href={reportAccess.reportHref}>
                  <FileText size={16} />
                  Zobacz raport
                </BrandLinkButton>
              ) : reportAccess.unlockHref ? (
                <BrandLinkButton href={reportAccess.unlockHref}>
                  <KeyRound size={16} />
                  Odblokuj raport
                </BrandLinkButton>
              ) : null}

              <BrandLinkButton href="/my/assessment" variant="secondary">
                <ArrowLeft size={16} />
                Wróć do moich badań
              </BrandLinkButton>

              {reportAccess.message ? (
                <p className="mt-2 text-xs leading-5 text-[#6b7280]">
                  {reportAccess.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-3 md:p-8">
            <MetricCard
              label="Projekt"
              value={payload?.project?.name ?? "—"}
              icon={<ShieldCheck size={18} />}
            />

            <MetricCard
              label="Odpowiedzi"
              value={`${answeredCount} / ${totalCount} (${responseCompletionPercent}%)`}
              icon={<ClipboardCheck size={18} />}
            />

            <MetricCard
              label="Zapis wyniku"
              value={formatDateTime(payload?.frozenAt)}
              icon={<CheckCircle2 size={18} />}
            />
          </div>
        </section>

        {!reportAccess.isUnlocked ? (
          <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
                <LockKeyhole size={19} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Odblokowanie raportu
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Jeśli masz kod dostępu, wpisz go poniżej. Po odblokowaniu
                  raport pojawi się w tym widoku oraz w zakładce raportów.
                </p>
              </div>
            </div>

            <RedeemReportAccessCodeForm
              tenantSlug={result.tenantSlug}
              sessionId={result.sessionId}
            />
          </section>
        ) : null}

        {/* <section className="space-y-5">
          <SectionIntro
            eyebrow="Podsumowanie"
            title="Wyniki wymiarów"
            description="To zapis wyników utworzony w momencie zakończenia badania. Dzięki temu późniejsze zmiany w kwestionariuszu nie zmienią tego podsumowania."
            icon={<BarChart3 size={20} />}
          />

          {scores.length === 0 ? (
            <EmptyPanel>
              Brak zapisanych wyników wymiarów. Jeżeli ten widok powinien
              pokazywać wyniki, sprawdź, czy przed utworzeniem snapshotu
              uruchamiane jest przeliczenie wyników sesji.
            </EmptyPanel>
          ) : (
            <div className="space-y-5">
              {scoreGroups.map((group) => (
                <section key={group.key} className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-3 px-1">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                        {group.label}
                      </h3>

                      <p className="mt-1 text-sm text-[#6b7280]">
                        Liczba wymiarów: {group.scores.length}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {group.scores.map((score, index) => (
                      <ScoreCard
                        key={getScoreKey(score, index)}
                        score={score}
                        index={index}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section> */}

        <section className="space-y-5">
          <SectionIntro
            eyebrow="Odpowiedzi"
            title="Zapisane odpowiedzi"
            description="Ta sekcja pokazuje odpowiedzi zapisane w sesji. Dla przejrzystości szczegóły są pogrupowane według części kwestionariusza."
            icon={<FileText size={20} />}
          />

          {responses.length === 0 ? (
            <EmptyPanel>Brak zapisanych odpowiedzi w snapshocie.</EmptyPanel>
          ) : (
            <div className="space-y-4">
              {responseGroups.map((group, groupIndex) => (
                <details
                  key={group.key}
                  className="group rounded-[2rem] border border-black/10 bg-white/75 shadow-sm backdrop-blur"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-5 outline-none transition hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-sm font-semibold text-[#171717]">
                        {groupIndex + 1}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
                          {group.title}
                        </h3>

                        {group.description ? (
                          <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                            {group.description}
                          </p>
                        ) : null}

                        <p className="mt-1 text-xs text-[#8b9099]">
                          Liczba odpowiedzi: {group.responses.length}
                        </p>
                      </div>
                    </div>

                    <ChevronDown
                      size={18}
                      className="mt-1 shrink-0 text-[#6b7280] transition group-open:rotate-180"
                    />
                  </summary>

                  <div className="border-t border-black/10">
                    {group.responses.map((response, responseIndex) => (
                      <div
                        key={getResponseKey(response, responseIndex)}
                        className="border-b border-black/10 px-5 py-4 last:border-b-0"
                      >
                        <div className="grid gap-3 md:grid-cols-1 md:items-start">
                         <div className="flex items-center justify-start space-x-4">
                           <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-xs font-semibold text-[#171717]">
                            {responseIndex + 1}
                          </div>

                          <p className="text-sm leading-6 text-[#171717]">
                            {response.itemText ?? "—"}
                          </p>
                         </div>

                          <div className="ml-12 w-fit  rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-sm font-semibold text-[#0f766e]">
                            {response.responseDisplayValue ?? "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}