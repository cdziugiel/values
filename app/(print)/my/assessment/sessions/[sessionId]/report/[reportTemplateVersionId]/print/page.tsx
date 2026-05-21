// app/(print)/my/assessment/sessions/[sessionId]/report/[reportTemplateVersionId]/print/page.tsx

import { notFound, redirect } from "next/navigation";

import { getMyAssessmentCompletedResult } from "@/features/my-assessment/api/my-assessment-result.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";
import { getActiveReportAccessGrantForSession } from "@/features/report-access/api/report-access.queries";
import { assertCanViewMyAssessmentReport } from "@/features/report-access/api/report-access-guard.queries";
import { requireSession } from "@/server/auth/require-session";

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
  const { tenant } = await searchParams;

  if (!tenant) {
    notFound();
  }

  if (!isUuid(sessionId) || !isUuid(reportTemplateVersionId)) {
    notFound();
  }

  const authSession = await requireSession();

  const access = await assertCanViewMyAssessmentReport({
    tenantSlug: tenant,
    sessionId,
    reportTemplateVersionId,
  });

  if (!access.ok) {
    redirect(
      `/my/assessment/sessions/${sessionId}/unlock-report?tenant=${tenant}`,
    );
  }

  const result = await getMyAssessmentCompletedResult({
    tenantSlug: tenant,
    sessionId,
  });

  if (!result?.payload) {
    notFound();
  }

  const grant = await getActiveReportAccessGrantForSession({
    tenantSlug: tenant,
    sessionId,
    reportTemplateVersionId,
    userId: authSession.user.id,
  });

  if (!grant) {
    redirect(
      `/my/assessment/sessions/${sessionId}/unlock-report?tenant=${tenant}`,
    );
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