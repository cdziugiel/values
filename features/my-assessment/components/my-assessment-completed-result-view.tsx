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

  const projectName =
    payload?.project?.name?.trim() || "HUMANET VALUES";

  return (
    <main className="min-h-screen hv-brand-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="p-6 text-center sm:p-8 md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              <CheckCircle2 size={32} strokeWidth={1.8} />
            </div>

            <div className="mt-6 inline-flex items-center rounded-full px-3 py-1 hv-brand-pill">
              <span className="hv-brand-eyebrow text-[0.68rem]">
                HUMANET VALUES
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-4xl">
              Badanie zostało ukończone
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#6b7280]">
              Dziękujemy. Twoje odpowiedzi zostały bezpiecznie zapisane.
            </p>

            <div className="mx-auto mt-7 grid max-w-xl gap-3 rounded-2xl border border-black/10 bg-white/55 p-4 text-left sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#8b9099]">
                  Badanie
                </p>

                <p className="mt-1 text-sm font-semibold text-[#171717]">
                  {projectName}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#8b9099]">
                  Ukończono
                </p>

                <p className="mt-1 text-sm font-semibold text-[#171717]">
                  {formatDateTime(payload?.frozenAt)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {reportAccess.reportHref ? (
          <section className="rounded-[2rem] hv-brand-card p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <FileText size={21} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                    Twój raport jest gotowy
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b7280]">
                    Możesz teraz przejść do wyników i ich indywidualnej
                    interpretacji.
                  </p>
                </div>
              </div>

              <BrandLinkButton href={reportAccess.reportHref}>
                <FileText size={16} />
                Zobacz mój raport
              </BrandLinkButton>
            </div>
          </section>
        ) : reportAccess.unlockHref ? (
          <section className="rounded-[2rem] hv-brand-card p-6 sm:p-8">
            <div className="flex gap-4">


              <div className="min-w-0 flex flex-col flex-1 items-center text-center">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Twój raport może zostać odblokowany
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b7280]">
                  Raport zawiera interpretację wyników oraz indywidualne
                  wnioski wynikające z badania.
                </p>

                <div className="mt-5">
                  <BrandLinkButton href={reportAccess.unlockHref}>
                    <KeyRound size={16} />
                    Odblokuj raport
                  </BrandLinkButton>
                </div>

                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-black/10" />
                  <span className="text-xs font-medium uppercase tracking-wide text-[#8b9099]">
                    lub użyj kodu
                  </span>
                  <div className="h-px flex-1 bg-black/10" />
                </div>

                <RedeemReportAccessCodeForm
                  tenantSlug={result.tenantSlug}
                  sessionId={result.sessionId}
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-[2rem] hv-brand-card p-6 sm:p-8">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#6b7280]">
                <FileText size={21} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Raport nie jest jeszcze dostępny
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b7280]">
                  Twoje odpowiedzi zostały zapisane. Informacja o możliwości
                  otwarcia raportu pojawi się w sekcji „Moje badania”.
                </p>

                {reportAccess.message ? (
                  <p className="mt-3 text-sm leading-6 text-[#6b7280]">
                    {reportAccess.message}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        )}

        <div className="flex justify-center pb-4">
          <BrandLinkButton href="/my/assessment" variant="secondary">
            <ArrowLeft size={16} />
            Wróć do moich badań
          </BrandLinkButton>
        </div>
      </div>
    </main>
  );
}