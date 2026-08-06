import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPartnerAssessmentSessionPreview } from "@/features/assessment-results";
import {
  getReportTemplateVersionForRender,
  ReportDocumentPreviewFrame,
  renderReportDocument,
  resolveReportPreviewConfig,
} from "@/features/report-builder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    sessionId: string;
    reportTemplateVersionId: string;
  }>;

  searchParams: Promise<{
    projectQuestionnaireId?: string;
    questionnaireVersionId?: string;
  }>;
};

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

function buildResultsHref({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  return `/t/${tenantSlug}/assessment-sessions/${sessionId}/results`;
}

export default async function PartnerAssessmentSessionTeaserPage({
  params,
  searchParams,
}: PageProps) {
  const {
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
  } = await params;

  const {
    projectQuestionnaireId,
    questionnaireVersionId,
  } = await searchParams;

  const normalizedProjectQuestionnaireId =
    normalizeOptionalString(projectQuestionnaireId);
  const normalizedQuestionnaireVersionId =
    normalizeOptionalString(questionnaireVersionId);

  const preview = await getPartnerAssessmentSessionPreview({
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId:
      normalizedProjectQuestionnaireId,
    questionnaireVersionId:
      normalizedQuestionnaireVersionId,
  });

  if (!preview?.payload) {
    notFound();
  }

  const reportTemplateVersion =
    await getReportTemplateVersionForRender({
      reportTemplateVersionId,
    });

  if (!reportTemplateVersion) {
    notFound();
  }

  const teaserConfig = resolveReportPreviewConfig(
    reportTemplateVersion.config,
  ).personalTeaser;

  if (!teaserConfig.enabled) {
    notFound();
  }

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: preview.payload,
    mode: "personal_teaser",
    pageCodes: teaserConfig.pageCodes,
    watermark: teaserConfig.watermark,
    showUnlockAction: false,
  });

  const resultsHref = buildResultsHref({
    tenantSlug,
    sessionId,
  });

  return (
    <main className="min-h-screen hv-brand-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[2rem] hv-brand-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <Eye size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  BEZPŁATNE PODSUMOWANIE
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[#171717] sm:text-4xl">
                {preview.respondent.displayName}
              </h1>

              <p className="mt-3 text-base leading-7 text-[#6b7280]">
                {preview.material.questionnaireName}
                {preview.material.questionnaireVersion
                  ? ` · wersja ${preview.material.questionnaireVersion}`
                  : ""}
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Podsumowanie prezentuje wybrane elementy rzeczywistego wyniku.
                Jest dostępne, ponieważ do sesji zostały przypisane kompletne
                dane normatywne. Sam profil normatywny respondenta nie jest tutaj
                ujawniany.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="rounded-full border-black/10 bg-white/70"
            >
              <Link href={resultsHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Wróć do sesji
              </Link>
            </Button>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[rgba(45,212,191,0.28)] bg-[rgba(45,212,191,0.10)] p-4 text-sm leading-6 text-[#0f766e]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              To podsumowanie nie zastępuje pełnego raportu i nie zawiera
              surowych wyników technicznych ani danych użytych do budowy norm.
            </p>
          </div>
        </section>

        <ReportDocumentPreviewFrame html={rendered.html} />
      </div>
    </main>
  );
}
