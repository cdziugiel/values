// HUMANET_INSTALLER: comparison-report-ui-pdf-v1

import { NextRequest } from "next/server";

import { resolveMyComparisonReportGrantForRender } from "@/features/comparison-reports/api/my-comparison-report-grant.queries";
import { renderReportPdfFromUrl } from "@/features/report-builder/lib/render-report-pdf";
import { resolveReportRenderOrigin } from "@/features/report-builder/lib/resolve-report-render-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    grantId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { grantId } = await params;

  const resolved = await resolveMyComparisonReportGrantForRender({
    grantId,
  });

  if (!resolved) {
    return new Response("Nie znaleziono dostępnego raportu porównawczego.", {
      status: 404,
    });
  }

  if (!resolved.data.eligibility.canRender || !resolved.data.payload) {
    return new Response(
      "Nie można wygenerować raportu porównawczego, ponieważ brakuje wymaganych danych źródłowych.",
      { status: 409 },
    );
  }

  const printUrl = new URL(
    "/my/assessment/comparison-reports/grants/" +
      encodeURIComponent(grantId) +
      "/print",
    resolveReportRenderOrigin(request),
  );

  const pdf = await renderReportPdfFromUrl({
    url: printUrl.toString(),
    cookieHeader: request.headers.get("cookie") ?? undefined,
  });

  const filename = "humanet-comparison-report-" + grantId + ".pdf";

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
