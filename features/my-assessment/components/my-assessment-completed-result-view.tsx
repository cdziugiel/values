// features/my-assessment/components/my-assessment-completed-result-view.tsx

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  Eye,
  FileDown,
  FileText,
  KeyRound,
  LockKeyhole,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  NormativeProfileCard,
  resetNormativeProfileDevelopmentAction,
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
  responseDisplayValue?:
  | string
  | number
  | boolean
  | null;
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
  variant?: "primary" | "secondary" | "accent";
}) {
  const className =
    variant === "primary"
      ? [
        "inline-flex min-h-12 items-center justify-center gap-2",
        "rounded-full bg-[#171717] px-6",
        "text-sm font-semibold text-white shadow-sm",
        "transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]",
        "hover:shadow-[0_10px_30px_rgba(15,23,42,0.12)]",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[#2dd4bf]/50",
      ].join(" ")
      : variant === "accent"
        ? [
          "inline-flex min-h-12 items-center justify-center gap-2",
          "rounded-full bg-[#0f766e] px-6",
          "text-sm font-semibold text-white shadow-sm",
          "transition hover:-translate-y-0.5 hover:bg-[#115e59]",
          "hover:shadow-[0_10px_30px_rgba(15,118,110,0.2)]",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[#2dd4bf]/50",
        ].join(" ")
        : [
          "inline-flex min-h-11 items-center justify-center gap-2",
          "rounded-full border border-black/10 bg-white/70 px-5",
          "text-sm font-semibold text-[#171717] shadow-sm",
          "transition hover:-translate-y-0.5 hover:bg-white",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[#2dd4bf]/50",
        ].join(" ");

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}



function BasicFeedbackSection({
  teaserHref,
  thankYou
}: {
  teaserHref: string | null;
  thankYou?: any
}) {
  if (!teaserHref) {
    return null;
  }

  return (
    <section
  id="basic-feedback"
  className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-[rgba(15,118,110,0.18)] bg-[linear-gradient(145deg,rgba(240,253,250,0.96),rgba(255,255,255,0.98))] shadow-sm"
>
      <div className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.16)] text-[#0f766e]">
            <Sparkles size={24} />
          </div>

          {/*         <p className="mt-5 hv-brand-eyebrow text-[0.68rem]">
            PODSTAWOWA INFORMACJA ZWROTNA
          </p> */}

          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#171717] sm:text-3xl">
            Możesz zapoznać się z wynikiem
          </h2>



          <div className="mt-6 mb-4">
            <BrandLinkButton
              href={teaserHref}
              variant="accent"
            >
              <Eye size={17} />
              Zobacz
            </BrandLinkButton>
          </div>


        </div>
        <div className="mt-4">
          {thankYou}
        </div>
      </div>
    </section>
  );
}

function FullReportPurchaseSection({
  unlockHref,
  sampleHref,
  tenantSlug,
  sessionId,
}: {
  unlockHref: string | null;
  sampleHref: string | null;
  tenantSlug: string;
  sessionId: string;
}) {
  if (!unlockHref) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[2rem] bg-[#171717] text-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
      <div className="p-6 sm:p-8 md:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#5eead4]">
            <FileText size={24} />
          </div>

          <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#5eead4]">
            PEŁNY RAPORT HUMANET
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
            Odkryj pełny obraz swojego profilu
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/68">
            Pełny raport rozwija podstawowy wynik o
            szczegółową interpretację obszarów
            funkcjonowania, zależności między systemami
            wartości oraz indywidualne wnioski wynikające
            z badania.
          </p>

          <div className="mx-auto mt-7 grid max-w-xl gap-3 text-left sm:grid-cols-3">
            {[
              {
                title: "Pełna interpretacja",
                description:
                  "Szczegółowe omówienie wszystkich obszarów.",
              },
              {
                title: "Wykresy i zależności",
                description:
                  "Rozkład wyników i relacje pomiędzy nimi.",
              },
              {
                title: "Wnioski rozwojowe",
                description:
                  "Znaczenie wyniku dla codziennego funkcjonowania.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.055] p-4"
              >
                <CheckCircle2
                  size={18}
                  className="text-[#5eead4]"
                />

                <p className="mt-3 text-sm font-semibold">
                  {item.title}
                </p>

                <p className="mt-1 text-xs leading-5 text-white/58">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex justify-center">
            <Link
              href={unlockHref}
              className={[
                "inline-flex min-h-12 items-center justify-center gap-2",
                "rounded-full bg-white px-7",
                "text-sm font-semibold text-[#171717]",
                "shadow-sm transition hover:-translate-y-0.5",
                "hover:bg-[#f4f4f4]",
                "hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[#5eead4]",
              ].join(" ")}
            >
              <KeyRound size={17} />
              Odblokuj pełny raport
            </Link>
          </div>

          {sampleHref ? (
            <div className="mt-5">


              <Link
                href={sampleHref}
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#5eead4] underline-offset-4 hover:underline"
              >
                <FileDown size={16} />
                Zobacz przykładową próbkę raportu
              </Link>
            </div>
          ) : null}
        </div>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />

          <span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-white/38">
            lub użyj kodu dostępu
          </span>

          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="rounded-2xl bg-white p-4 text-[#171717] sm:p-5">
          <RedeemReportAccessCodeForm
            tenantSlug={tenantSlug}
            sessionId={sessionId}
          />
        </div>
      </div>
    </section>
  );
}

export async function MyAssessmentCompletedResultView({
  result,
  normativeProfile,
}: MyAssessmentCompletedResultViewProps) {
  const payload = result.payload;

  const reportAccess =
    await getMyAssessmentReportAccessState({
      tenantSlug: result.tenantSlug,
      sessionId: result.sessionId,
      projectQuestionnaireId:
        result.projectQuestionnaireId ?? null,
      questionnaireVersionId:
        result.questionnaireVersionId ?? null,
    });

  const projectName =
    payload?.project?.name?.trim() ||
    "HUMANET VALUES";

  const normativeProfileCompleted =
    normativeProfile?.status.completed === true;

  /**
   * Użytkownik posiadający pełny raport nie powinien
   * być blokowany przez stan metryczki normalizacyjnej.
   */
  const canShowResultArea =
    normativeProfileCompleted ||
    reportAccess.isUnlocked;

const completedPageParams =
  new URLSearchParams({
    tenant: result.tenantSlug,
  });

if (result.projectQuestionnaireId) {
  completedPageParams.set(
    "projectQuestionnaireId",
    result.projectQuestionnaireId,
  );
}

if (result.questionnaireVersionId) {
  completedPageParams.set(
    "questionnaireVersionId",
    result.questionnaireVersionId,
  );
}

const completedPageHref =
  `/my/assessment/sessions/${result.sessionId}/completed` +
  `?${completedPageParams.toString()}`;

  return (
    <main className="min-h-screen hv-brand-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {<section className="overflow-hidden rounded-[2rem] hv-brand-card">
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
              Twoje odpowiedzi zostały
              zapisane.
            </p>


          </div>
        </section>}



        {!normativeProfileCompleted &&
          normativeProfile &&
          !reportAccess.isUnlocked ? (
          <>


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
                redirectTo={completedPageHref}
              />
            </section>
          </>
        ) : null}


{canShowResultArea &&
                normativeProfile ? (
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
                    minimal={true}

                    redirectTo={completedPageHref}
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
                    Twój pełny raport jest gotowy
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b7280]">
                    Możesz przejść do pełnych wyników,
                    wykresów oraz indywidualnej
                    interpretacji.
                  </p>
                </div>
              </div>

              <BrandLinkButton
                href={reportAccess.reportHref}
              >
                <FileText size={16} />
                Pokaż pełny raport
              </BrandLinkButton>
            </div>
          </section>
        ) : canShowResultArea ? (
          <>
            <BasicFeedbackSection
              teaserHref={
                reportAccess.teaserHref
              }
            />


            <FullReportPurchaseSection
              unlockHref={
                reportAccess.unlockHref
              }
              sampleHref={
                reportAccess.sampleHref
              }
              tenantSlug={result.tenantSlug}
              sessionId={result.sessionId}
            />
          </>
        ) : null}

        {!normativeProfile &&
          !reportAccess.reportHref ? (
          <section className="rounded-[2rem] hv-brand-card p-6 sm:p-8">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#6b7280]">
                <LockKeyhole size={21} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Kolejny etap nie jest jeszcze dostępny
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b7280]">
                  Twoje odpowiedzi zostały zapisane.
                  Informacja o dalszych możliwościach
                  pojawi się w sekcji „Moje badania”.
                </p>

                {reportAccess.message ? (
                  <p className="mt-3 text-sm leading-6 text-[#6b7280]">
                    {reportAccess.message}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <div className="flex justify-center pb-4">
          <BrandLinkButton
            href="/my/assessment"
            variant="secondary"
          >
            <ArrowLeft size={16} />
            Wróć do moich badań
          </BrandLinkButton>

        </div>
        {process.env.NODE_ENV !== "production" &&
          normativeProfile?.status.completed ? (
          <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  Narzędzie testowe
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Reset usuwa testowy profil normalizacyjny
                  użytkownika i pozwala ponownie sprawdzić ekran
                  przed uzupełnieniem formularza. Funkcja nie
                  będzie dostępna na produkcji.
                </p>
              </div>

              <form
                action={
                  resetNormativeProfileDevelopmentAction
                }
                className="shrink-0"
              >
                <input
                  type="hidden"
                  name="tenantSlug"
                  value={result.tenantSlug}
                />

                <input
                  type="hidden"
                  name="assessmentSessionId"
                  value={result.sessionId}
                />

                <button
                  type="submit"
                  className={[
                    "inline-flex min-h-10 items-center justify-center gap-2",
                    "rounded-full border border-amber-300 bg-white px-4",
                    "text-sm font-semibold text-amber-950",
                    "transition hover:bg-amber-100",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-amber-400/60",
                  ].join(" ")}
                >
                  <RotateCcw size={15} />
                  Zresetuj dane testowe
                </button>
              </form>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}