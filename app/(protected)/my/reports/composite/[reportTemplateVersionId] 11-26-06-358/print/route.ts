// app/(protected)/my/reports/composite/[reportTemplateVersionId]/print/route.ts

import { NextRequest } from "next/server";

import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

import {
  getActiveReportAccessGrantForSubject,
  resolveRespondentForCurrentUser,
} from "@/features/report-access/api/report-access.queries";

import { requireSession } from "@/server/auth/require-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    reportTemplateVersionId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { reportTemplateVersionId } = await params;

  const tenantSlug = request.nextUrl.searchParams.get("tenant");

  if (!tenantSlug) {
    return new Response("Brak kontekstu tenanta.", {
      status: 400,
    });
  }

  const authSession = await requireSession();

  const resolved = await resolveRespondentForCurrentUser({
    tenantSlug,
  });

  if (!resolved.ok) {
    return new Response(resolved.message, {
      status: 404,
    });
  }

  const grant = await getActiveReportAccessGrantForSubject({
    tenantSlug,
    subjectType: "respondent",
    subjectId: resolved.respondent.id,
    reportTemplateVersionId,
    userId: authSession.user.id,
  });

  if (!grant) {
    return new Response("Raport złożony nie został odblokowany.", {
      status: 403,
    });
  }

  const [data, reportTemplateVersion] = await Promise.all([
    getPersonalCompositeReport({
      tenantSlug,
      respondentId: resolved.respondent.id,
      reportTemplateVersionId,
      previewMode: false,
    }),
    getReportTemplateVersionForRender({
      reportTemplateVersionId,
    }),
  ]);

  if (!data || !reportTemplateVersion) {
    return new Response("Nie znaleziono raportu złożonego.", {
      status: 404,
    });
  }

  if (!data.eligibility.canRender) {
    return new Response(
      "Nie można wygenerować raportu złożonego, ponieważ brakuje wymaganych danych źródłowych.",
      {
        status: 409,
      },
    );
  }

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: data.payload,
  });

  return new Response(rendered.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}