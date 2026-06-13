// app/(protected)/my/assessment/sessions/[sessionId]/report/[reportTemplateVersionId]/pdf/route.ts

import { NextRequest } from "next/server";

import { assertCanViewMyAssessmentReport } from "@/features/report-access/api/report-access-guard.queries";
import { renderReportPdfFromUrl } from "@/features/report-builder/lib/render-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    sessionId: string;
    reportTemplateVersionId: string;
  }>;
};

function normalizeOptionalString(value: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId, reportTemplateVersionId } = await params;

  const tenantSlug = normalizeOptionalString(
    request.nextUrl.searchParams.get("tenant"),
  );

  const projectQuestionnaireId = normalizeOptionalString(
    request.nextUrl.searchParams.get("projectQuestionnaireId"),
  );

  const questionnaireVersionId = normalizeOptionalString(
    request.nextUrl.searchParams.get("questionnaireVersionId"),
  );

  if (!tenantSlug) {
    return new Response("Brak kontekstu tenanta.", {
      status: 400,
    });
  }

  console.log("MY_REPORT_PDF_PARAMS", {
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  const access = await assertCanViewMyAssessmentReport({
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  if (!access.ok) {
    console.warn("MY_REPORT_PDF_ACCESS_DENIED", {
      tenantSlug,
      sessionId,
      reportTemplateVersionId,
      projectQuestionnaireId,
      questionnaireVersionId,
      message: access.message,
    });

    return new Response(access.message || "Brak dostępu do raportu.", {
      status: 403,
    });
  }

  const printUrl = new URL(
    `/my/assessment/sessions/${sessionId}/report/${reportTemplateVersionId}/print`,
    request.nextUrl.origin,
  );

  printUrl.searchParams.set("tenant", tenantSlug);

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

  console.log("MY_REPORT_PDF_PRINT_URL", {
    url: printUrl.toString(),
  });

  const pdf = await renderReportPdfFromUrl({
    url: printUrl.toString(),
    cookieHeader: request.headers.get("cookie") ?? undefined,
  });

  const filenameScope =
    projectQuestionnaireId ?? questionnaireVersionId ?? sessionId;

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