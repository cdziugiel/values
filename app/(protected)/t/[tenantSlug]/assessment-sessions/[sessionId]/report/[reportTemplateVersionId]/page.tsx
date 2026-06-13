import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantAssessmentSessionReport } from "@/features/assessment-results/api/assessment-session-report.queries";
import { ReportDocumentPreviewFrame } from "@/features/report-builder/components/report-document-preview-frame";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

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

export default async function TenantAssessmentSessionReportPage({
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

const result = await getTenantAssessmentSessionReport({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,

  projectQuestionnaireId:
    projectQuestionnaireId?.trim() || null,

  questionnaireVersionId:
    questionnaireVersionId?.trim() || null,
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

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: result.payload,
  });

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            HUMANET VALUES · Raport respondenta
          </div>

          <h1 className="mt-1 text-3xl font-semibold">
            {result.respondent.displayName}
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Projekt: {result.project.name}
          </p>

          {result.respondent.email ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {result.respondent.email}
            </p>
          ) : null}

          <p className="mt-2 text-xs text-muted-foreground">
            Widoczne strony raportu: {rendered.visiblePages.length}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={
  `/t/${tenantSlug}/assessment-sessions/${sessionId}/results` +
  `?projectQuestionnaireId=${encodeURIComponent(
    projectQuestionnaireId ?? "",
  )}`
}
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do wyniku sesji
          </Link>

          <Link
            href={`/t/${tenantSlug}/assessment-projects/${result.project.id}/results`}
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do wyników projektu
          </Link>
        </div>
      </div>

      <ReportDocumentPreviewFrame html={rendered.html} />
    </main>
  );
}