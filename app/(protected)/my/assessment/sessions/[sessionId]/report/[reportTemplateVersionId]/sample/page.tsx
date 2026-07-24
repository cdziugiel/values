import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, LockKeyhole } from "lucide-react";
import { renderSanitizedReportPreviewHtml } from "@/features/report-builder/lib/render-sanitized-report-preview";
import { Button } from "@/components/ui/button";
import { assertCanViewMyAssessmentReportPreview } from "@/features/report-access/api/report-preview-guard.queries";
import { ReportDocumentPreviewFrame } from "@/features/report-builder/components/report-document-preview-frame";
import { buildRedactedReportPayload } from "@/features/report-builder/lib/report-preview-payload";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

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

export default async function MyReportSamplePage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId, reportTemplateVersionId } = await params;

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
    access.previewConfig.sampleRedacted;

  if (!config.enabled) {
    notFound();
  }

const rendered = renderReportDocument({
  reportTemplateVersion:
    access.reportTemplateVersion,
  payload: access.result.payload,
  mode: "sample_redacted",
  pageCodes: config.pageCodes,
  watermark: config.watermark,
});

/**
 * Pełny HTML pozostaje po stronie serwera.
 * Do komponentu trafia wyłącznie oczyszczona wersja.
 */
const sanitizedHtml =
  await renderSanitizedReportPreviewHtml({
    html: rendered.html,
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
    `/report/${reportTemplateVersionId}/sample/pdf` +
    `?${scopedParams.toString()}`;

  const unlockHref =
    `/my/assessment/sessions/${sessionId}` +
    `/unlock-report?${scopedParams.toString()}`;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0f766e]">
            HUMANET VALUES
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#171717] sm:text-3xl">
            Przykładowa wersja pełnego raportu
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
            Zobacz układ, zakres oraz sposób prezentacji
            pełnego raportu. Wykresy i indywidualne
            interpretacje zostały celowo ukryte.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.allowPdfDownload ? (
            <Button asChild variant="outline">
              <a
                href={pdfHref}
                target="_blank"
                rel="noreferrer"
              >
                <Download className="mr-2 h-4 w-4" />
                Pobierz przykład PDF
              </a>
            </Button>
          ) : null}

          <Button asChild>
            <Link href={unlockHref}>
              <LockKeyhole className="mr-2 h-4 w-4" />
              Odblokuj mój raport
            </Link>
          </Button>
        </div>
      </div>

      <ReportDocumentPreviewFrame html={sanitizedHtml} />
    </main>
  );
}