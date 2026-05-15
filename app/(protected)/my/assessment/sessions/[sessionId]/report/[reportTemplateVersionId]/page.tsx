// app/(protected)/my/assessment/sessions/[sessionId]/report/[reportTemplateVersionId]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";

import { getMyAssessmentCompletedResult } from "@/features/my-assessment/api/my-assessment-result.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";
import { ReportDocumentPreviewFrame } from "@/features/report-builder/components/report-document-preview-frame";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    sessionId: string;
    reportTemplateVersionId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
  }>;
};

export default async function MyAssessmentReportPage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId, reportTemplateVersionId } = await params;
  const { tenant } = await searchParams;

  if (!tenant) {
    notFound();
  }

  const result = await getMyAssessmentCompletedResult({
    tenantSlug: tenant,
    sessionId,
  });

  if (!result?.payload) {
    notFound();
  }

  const reportTemplateVersion = await getReportTemplateVersionForRender({
    reportTemplateVersionId,
  });

  if (!reportTemplateVersion) {
    notFound();
  }
const allowedQuestionnaireVersionIds = Array.isArray(
  result.payload?.questionnaires,
)
  ? result.payload.questionnaires
      .map((questionnaire: any) => questionnaire.questionnaireVersionId)
      .filter(Boolean)
  : [];

if (
  !allowedQuestionnaireVersionIds.includes(
    reportTemplateVersion.questionnaireVersionId,
  )
) {
  notFound();
}
  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: result.payload,
  });

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            HUMANET VALUES · Raport
          </div>

          <h1 className="mt-1 text-3xl font-semibold">
            {reportTemplateVersion.name}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Widoczne strony: {rendered.visiblePages.length}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/my/assessment/sessions/${sessionId}/completed?tenant=${tenant}`}
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do wyniku
          </Link>

{/*           <button
            type="button"
            onClick={() => {
              // Ten przycisk działa tylko po stronie klienta, więc poniżej dodamy mały client wrapper w następnym kroku.
            }}
            className="hidden h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Drukuj / PDF
          </button> */}
        </div>
      </div>

      <ReportDocumentPreviewFrame html={rendered.html} />
    </main>
  );
}