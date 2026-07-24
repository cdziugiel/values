import { notFound } from "next/navigation";

import { assertCanViewMyAssessmentReportPreview } from "@/features/report-access/api/report-preview-guard.queries";
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

export default async function MyReportTeaserPrintPage({
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

  const access = await assertCanViewMyAssessmentReportPreview({
    tenantSlug: tenant,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId: projectQuestionnaireId ?? null,
    questionnaireVersionId: questionnaireVersionId ?? null,
  });

  if (!access.ok) {
    notFound();
  }

  const config = access.previewConfig.personalTeaser;

  if (!config.enabled || !config.allowPdfDownload) {
    notFound();
  }

  const rendered = renderReportDocument({
    reportTemplateVersion: access.reportTemplateVersion,
    payload: access.result.payload,
    mode: "personal_teaser",
    pageCodes: config.pageCodes,
    watermark: config.watermark,
  });

  return (
    <div
      className="report-print-root"
      dangerouslySetInnerHTML={{
        __html: rendered.html,
      }}
    />
  );
}