import { NextRequest } from "next/server";

import { getTenantAssessmentSessionReport } from "@/features/assessment-results/api/assessment-session-report.queries";
import { getSuperAdminBuilderPreviewReport } from "@/features/report-builder/api/report-preview-real-session.queries";
import { renderReportPdfFromUrl } from "@/features/report-builder/lib/render-report-pdf";
import { resolveReportRenderOrigin } from "@/features/report-builder/lib/resolve-report-render-origin";

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

  const source = normalizeOptionalString(
    request.nextUrl.searchParams.get("source"),
  );

  const isBuilderPreview = source === "builder-preview";

  console.log("TENANT_REPORT_PDF_PARAMS", {
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId,
    questionnaireVersionId,
    source,
  });

  /*
   * Zwykły tryb zachowuje tenantowy guard i wymóg aktywnego grantu.
   * Builder preview korzysta wyłącznie z audytowanej ścieżki SUPER_ADMIN.
   */
  const report = isBuilderPreview
    ? await getSuperAdminBuilderPreviewReport({
        tenantSlug,
        sessionId,
        reportTemplateVersionId,
        projectQuestionnaireId,
        questionnaireVersionId,
      })
    : await getTenantAssessmentSessionReport({
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
      source,
    });

    return new Response("Brak dostępu do raportu.", {
      status: 403,
    });
  }

  const printUrl = new URL(
    `/t/${tenantSlug}/assessment-sessions/${sessionId}/report/${reportTemplateVersionId}/print`,
    resolveReportRenderOrigin(request),
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

  if (isBuilderPreview) {
    printUrl.searchParams.set(
      "source",
      "builder-preview",
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