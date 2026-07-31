import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Download,
  FileText,
  LockKeyhole,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMyAssessmentReportAccessState } from "@/features/my-assessment/api/my-assessment-report-link.queries";
import { ReportDocumentPreviewFrame } from "@/features/report-builder/components/report-document-preview-frame";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";
import { assertCanViewMyAssessmentReportPreview } from "@/features/report-access/api/report-preview-guard.queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    sessionId: string;
    reportTemplateVersionId: string;
  }>;

  searchParams: Promise<{
    tenant?: string;
    projectQuestionnaireId?: string;
    questionnaireVersionId?: string;
  }>;
};

function buildScopedParams({
  tenantSlug,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  tenantSlug: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const params = new URLSearchParams({
    tenant: tenantSlug,
  });

  if (projectQuestionnaireId) {
    params.set(
      "projectQuestionnaireId",
      projectQuestionnaireId,
    );
  }

  if (questionnaireVersionId) {
    params.set(
      "questionnaireVersionId",
      questionnaireVersionId,
    );
  }

  return params;
}

export default async function MyReportTeaserPage({
  params,
  searchParams,
}: PageProps) {
  const {
    sessionId,
    reportTemplateVersionId,
  } = await params;

  const {
    tenant,
    projectQuestionnaireId,
    questionnaireVersionId,
  } = await searchParams;

  if (!tenant) {
    notFound();
  }

  const access =
    await assertCanViewMyAssessmentReportPreview({
      tenantSlug: tenant,
      sessionId,
      reportTemplateVersionId,
      projectQuestionnaireId:
        projectQuestionnaireId ?? null,
      questionnaireVersionId:
        questionnaireVersionId ?? null,
    });

  if (!access.ok) {
    notFound();
  }

  const config =
    access.previewConfig.personalTeaser;

  if (!config.enabled) {
    notFound();
  }

  const reportAccess =
    await getMyAssessmentReportAccessState({
      tenantSlug: tenant,
      sessionId,
      projectQuestionnaireId:
        projectQuestionnaireId ?? null,
      questionnaireVersionId:
        questionnaireVersionId ?? null,
    });

  const reportActionHref =
    reportAccess.reportHref ??
    reportAccess.unlockHref;

  const reportActionLabel =
    reportAccess.isUnlocked
      ? "Przejdź do pełnego raportu"
      : "Odblokuj pełny raport";

  const rendered = renderReportDocument({
    reportTemplateVersion:
      access.reportTemplateVersion,
    payload: access.result.payload,
    mode: "personal_teaser",
    pageCodes: config.pageCodes,
    watermark: config.watermark,
    showUnlockAction:
      Boolean(reportActionHref),
    previewActionLabel:
      reportActionLabel,
  });

  const scopedParams = buildScopedParams({
    tenantSlug: tenant,
    projectQuestionnaireId:
      projectQuestionnaireId ?? null,
    questionnaireVersionId:
      questionnaireVersionId ?? null,
  });

  const pdfHref =
    `/my/assessment/sessions/${sessionId}` +
    `/report/${reportTemplateVersionId}` +
    `/teaser/pdf?${scopedParams.toString()}`;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0f766e]">
            HUMANET VALUES
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#171717] sm:text-3xl">
            Bezpłatny skrót Twojego wyniku
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
            Skrót pokazuje wybrane elementy
            Twojego rzeczywistego wyniku. Pełna
            interpretacja, szczegółowe wykresy
            i rekomendacje znajdują się w pełnym
            raporcie.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.allowPdfDownload ? (
            <Button
              asChild
              variant="outline"
            >
              <a
                href={pdfHref}
                target="_blank"
                rel="noreferrer"
              >
                <Download className="mr-2 h-4 w-4" />
                Pobierz skrót PDF
              </a>
            </Button>
          ) : null}

          {reportActionHref ? (
            <Button asChild>
              <Link href={reportActionHref}>
                {reportAccess.isUnlocked ? (
                  <FileText className="mr-2 h-4 w-4" />
                ) : (
                  <LockKeyhole className="mr-2 h-4 w-4" />
                )}

                {reportActionLabel}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <ReportDocumentPreviewFrame
        html={rendered.html}
        unlockHref={
          reportActionHref ?? undefined
        }
      />
    </main>
  );
}