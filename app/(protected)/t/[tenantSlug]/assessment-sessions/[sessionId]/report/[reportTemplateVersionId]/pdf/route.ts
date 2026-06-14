import { NextRequest } from "next/server";

import { getTenantAssessmentSessionReport } from "@/features/assessment-results/api/assessment-session-report.queries";
import { renderReportPdfFromUrl } from "@/features/report-builder/lib/render-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    tenantSlug: string;
    sessionId: string;
    reportTemplateVersionId: string;
  }>;
};

function normalizeOptionalString(value: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const {
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
  } = await params;

  const projectQuestionnaireId = normalizeOptionalString(
    request.nextUrl.searchParams.get("projectQuestionnaireId"),
  );

  const questionnaireVersionId = normalizeOptionalString(
    request.nextUrl.searchParams.get("questionnaireVersionId"),
  );

  console.log("TENANT_REPORT_PDF_PARAMS", {
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  /*
   * To query pełni tutaj rolę tenantowego guarda:
   * - wymaga sesji,
   * - rozwiązuje tenant context,
   * - sprawdza uprawnienie,
   * - sprawdza sesję i wersję raportu.
   */
  const report = await getTenantAssessmentSessionReport({
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  if (!report?.payload) {
    console.warn("TENANT_REPORT_PDF_ACCESS_DENIED", {
      tenantSlug,
      sessionId,
      reportTemplateVersionId,
      projectQuestionnaireId,
      questionnaireVersionId,
    });

    return new Response("Brak dostępu do raportu.", {
      status: 403,
    });
  }

  const printUrl = new URL(
    `/t/${tenantSlug}/assessment-sessions/${sessionId}/report/${reportTemplateVersionId}/print`,
    request.nextUrl.origin,
  );

  if (projectQuestionnaireId) {
    printUrl.searchParams.set(
      "projectQuestionnaireId",
      projectQuestionnaireId,
    );
  }

  if (questionnaireVersionId) {
    printUrl.searchParams.set(
      "questionnaireVersionId",
      questionnaireVersionId,
    );
  }

  console.log("TENANT_REPORT_PDF_PRINT_URL", {
    url: printUrl.toString(),
  });

  const pdf = await renderReportPdfFromUrl({
    url: printUrl.toString(),
    cookieHeader: request.headers.get("cookie") ?? undefined,
  });

  const filenameScope =
    projectQuestionnaireId ??
    questionnaireVersionId ??
    sessionId;

  const filename = `humanet-report-${filenameScope}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}