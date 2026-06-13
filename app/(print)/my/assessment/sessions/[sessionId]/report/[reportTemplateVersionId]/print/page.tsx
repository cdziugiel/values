// app/(print)/my/assessment/sessions/[sessionId]/report/[reportTemplateVersionId]/print/page.tsx

import { notFound } from "next/navigation";

import { getMyAssessmentCompletedResult } from "@/features/my-assessment/api/my-assessment-result.queries";
import { assertCanViewMyAssessmentReport } from "@/features/report-access/api/report-access-guard.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function MyAssessmentReportPrintPage({
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

  if (!isUuid(sessionId) || !isUuid(reportTemplateVersionId)) {
    notFound();
  }

  console.log("MY_REPORT_PRINT_PAGE_PARAMS", {
    tenant,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  const access = await assertCanViewMyAssessmentReport({
    tenantSlug: tenant,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId: projectQuestionnaireId ?? null,
    questionnaireVersionId: questionnaireVersionId ?? null,
  });

  if (!access.ok) {
    console.warn("MY_REPORT_PRINT_ACCESS_DENIED", {
      tenant,
      sessionId,
      reportTemplateVersionId,
      projectQuestionnaireId,
      questionnaireVersionId,
      message: access.message,
    });

    notFound();
  }

  const result = await getMyAssessmentCompletedResult({
    tenantSlug: tenant,
    sessionId,
    projectQuestionnaireId: projectQuestionnaireId ?? null,
    questionnaireVersionId: questionnaireVersionId ?? null,
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
    <main
      className="report-print-root"
      dangerouslySetInnerHTML={{ __html: rendered.html }}
    />
  );
}