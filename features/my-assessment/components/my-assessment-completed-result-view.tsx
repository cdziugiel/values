// features/my-assessment/components/my-assessment-completed-result-view.tsx

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  KeyRound,
} from "lucide-react";

import {
  NormativeProfileCard,
  type NormativeProfileStatusDto,
} from "@/features/normative-data";
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

type NormativeProfileViewData = {
  tenantSlug: string;
  assessmentSessionId: string;
  status: NormativeProfileStatusDto;
};

type MyAssessmentCompletedResultViewProps = {
  result: {
    tenantSlug: string;
    sessionId: string;
    payload: CompletedAssessmentPayload | null;
    projectQuestionnaireId?: string | null;
    questionnaireVersionId?: string | null;
  };

  normativeProfile?: NormativeProfileViewData | null;
};

function formatDateTime(value: unknown) {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

export async function MyAssessmentCompletedResultView({
  result,
  normativeProfile,
}: MyAssessmentCompletedResultViewProps) {
  const payload = result.payload;

  const reportAccess = await getMyAssessmentReportAccessState({
    tenantSlug: result.tenantSlug,
    sessionId: result.sessionId,
    projectQuestionnaireId:
      result.projectQuestionnaireId ?? null,
    questionnaireVersionId:
      result.questionnaireVersionId ?? null,
  });

  const projectName =
    payload?.project?.name?.trim() || "HUMANET VALUES";

  return (
    <main className="min-h-screen hv-brand-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="p-6 text-center sm:p-8 md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              <CheckCircle2
                size={32}
                strokeWidth={1.8}
              />
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

        {normativeProfile ? (
          <section
            id="normative-profile"
            className="scroll-mt-24"
          >
            <NormativeProfileCard
              tenantSlug={
                normativeProfile.tenantSlug
              }
              assessmentSessionId={
                normativeProfile.assessmentSessionId
              }
              initialStatus={
                normativeProfile.status
              }
            />
          </section>
        ) : null}

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

              <BrandLinkButton
                href={reportAccess.reportHref}
              >
                <FileText size={16} />
                Pokaż raport
              </BrandLinkButton>
            </div>
          </section>
        ) : reportAccess.unlockHref ? (
          <section className="rounded-[2rem] hv-brand-card p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                Twój raport może zostać odblokowany
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b7280]">
                Raport zawiera interpretację wyników oraz indywidualne
                wnioski wynikające z badania.
              </p>

              <div className="mt-5">
                <BrandLinkButton
                  href={reportAccess.unlockHref}
                >
                  <KeyRound size={16} />
                  Odblokuj raport
                </BrandLinkButton>
              </div>

              <div className="my-7 flex w-full items-center gap-4">
                <div className="h-px flex-1 bg-black/10" />

                <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-[#8b9099]">
                  lub użyj kodu dostępu
                </span>

                <div className="h-px flex-1 bg-black/10" />
              </div>

              <div className="w-full">
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
          <BrandLinkButton
            href="/my/assessment"
            variant="secondary"
          >
            <ArrowLeft size={16} />
            Wróć do moich badań
          </BrandLinkButton>
        </div>
      </div>
    </main>
  );
}