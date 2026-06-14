import { notFound } from "next/navigation";

import { getTenantAssessmentSessionReport } from "@/features/assessment-results/api/assessment-session-report.queries";
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function TenantAssessmentReportPrintPage({
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

  if (
    !tenantSlug.trim() ||
    !isUuid(sessionId) ||
    !isUuid(reportTemplateVersionId)
  ) {
    notFound();
  }

  console.log("TENANT_REPORT_PRINT_PAGE_PARAMS", {
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

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

  const reportTemplateVersion =
    await getReportTemplateVersionForRender({
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
    <main
      className="report-print-root"
      dangerouslySetInnerHTML={{
        __html: rendered.html,
      }}
    />
  );
}