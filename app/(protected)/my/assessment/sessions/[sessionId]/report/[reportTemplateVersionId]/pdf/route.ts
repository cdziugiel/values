// app/(protected)/my/assessment/sessions/[sessionId]/report/[reportTemplateVersionId]/pdf/route.ts

import { NextRequest } from "next/server";

import { getActiveReportAccessGrantForSession } from "@/features/report-access/api/report-access.queries";
import { assertCanViewMyAssessmentReport } from "@/features/report-access/api/report-access-guard.queries";
import { requireSession } from "@/server/auth/require-session";
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

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId, reportTemplateVersionId } = await params;

  const tenantSlug = request.nextUrl.searchParams.get("tenant");

  if (!tenantSlug) {
    return new Response("Brak kontekstu tenanta.", {
      status: 400,
    });
  }

  const authSession = await requireSession();

  const access = await assertCanViewMyAssessmentReport({
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
  });

  if (!access.ok) {
    return new Response("Brak dostępu do raportu.", {
      status: 403,
    });
  }

  const grant = await getActiveReportAccessGrantForSession({
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    userId: authSession.user.id,
  });

  if (!grant) {
    return new Response("Raport nie został odblokowany.", {
      status: 403,
    });
  }

  const printUrl = new URL(
    `/my/assessment/sessions/${sessionId}/report/${reportTemplateVersionId}/print`,
    request.nextUrl.origin,
  );

  printUrl.searchParams.set("tenant", tenantSlug);

  const pdf = await renderReportPdfFromUrl({
    url: printUrl.toString(),
    cookieHeader: request.headers.get("cookie") ?? undefined,
  });

  const filename = `humanet-report-${sessionId}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}