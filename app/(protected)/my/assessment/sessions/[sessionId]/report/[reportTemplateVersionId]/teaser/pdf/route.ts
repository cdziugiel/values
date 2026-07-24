import { NextRequest } from "next/server";

import { assertCanViewMyAssessmentReportPreview } from "@/features/report-access/api/report-preview-guard.queries";
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

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { sessionId, reportTemplateVersionId } = await params;

  const tenantSlug = normalizeOptionalString(
    request.nextUrl.searchParams.get("tenant"),
  );

  const projectQuestionnaireId = normalizeOptionalString(
    request.nextUrl.searchParams.get(
      "projectQuestionnaireId",
    ),
  );

  const questionnaireVersionId = normalizeOptionalString(
    request.nextUrl.searchParams.get(
      "questionnaireVersionId",
    ),
  );

  if (!tenantSlug) {
    return new Response("Brak kontekstu tenanta.", {
      status: 400,
    });
  }

  const access =
    await assertCanViewMyAssessmentReportPreview({
      tenantSlug,
      sessionId,
      reportTemplateVersionId,
      projectQuestionnaireId,
      questionnaireVersionId,
    });

  if (!access.ok) {
    return new Response(access.message, {
      status: 403,
    });
  }

  if (
    !access.previewConfig.personalTeaser.enabled ||
    !access.previewConfig.personalTeaser
      .allowPdfDownload
  ) {
    return new Response(
      "Pobieranie skrótu PDF jest wyłączone.",
      {
        status: 403,
      },
    );
  }
const printUrl = new URL(
  `/my/assessment/sessions/${sessionId}` +
    `/report/${reportTemplateVersionId}` +
    `/print/teaser`,
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

  const pdf = await renderReportPdfFromUrl({
    url: printUrl.toString(),
    cookieHeader:
      request.headers.get("cookie") ?? undefined,
  });

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        `attachment; filename="humanet-skrot-wyniku-${sessionId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}