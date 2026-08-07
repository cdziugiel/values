// app/(protected)/my/reports/composite/grants/[grantId]/print/route.ts

import { NextRequest } from "next/server";

import {
  getMyPersonalCompositeReportByGrantForCurrentUser,
} from "@/features/report-access/api/my-composite-report.queries";

import {
  getReportTemplateVersionForRender,
} from "@/features/report-builder/api/report-render.queries";

import {
  renderReportDocument,
} from "@/features/report-builder/lib/report-template-renderer";

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
  const { grantId } =
    await params;

  const tenantSlug =
    request.nextUrl.searchParams
      .get("tenant")
      ?.trim();

  if (!tenantSlug) {
    return new Response(
      "Brak kontekstu tenanta.",
      {
        status: 400,
      },
    );
  }

  /**
   * Ta trasa musi używać tej samej autoryzacji i danych,
   * co ekran raportu użytkownika.
   *
   * Dzięki temu Playwright nie jest przekierowywany
   * do /my/assessment lub strony logowania.
   */
  const data =
    await getMyPersonalCompositeReportByGrantForCurrentUser({
      tenantSlug,
      grantId,
    });

  if (!data) {
    return new Response(
      "Nie znaleziono dostępnego raportu złożonego.",
      {
        status: 404,
      },
    );
  }

  if (
    !data.eligibility.canRender
  ) {
    return new Response(
      "Nie można wygenerować raportu złożonego, ponieważ brakuje wymaganych danych źródłowych.",
      {
        status: 409,
      },
    );
  }

  const reportTemplateVersion =
    await getReportTemplateVersionForRender({
      reportTemplateVersionId:
        data.reportTemplateVersionId,
    });

  if (!reportTemplateVersion) {
    return new Response(
      "Nie znaleziono szablonu raportu.",
      {
        status: 404,
      },
    );
  }

  const rendered =
    renderReportDocument({
      reportTemplateVersion,
      payload: data.payload,
    });

  return new Response(
    rendered.html,
    {
      status: 200,
      headers: {
        "Content-Type":
          "text/html; charset=utf-8",

        "Cache-Control":
          "private, no-store",

        "X-Content-Type-Options":
          "nosniff",

        "X-Robots-Tag":
          "noindex, nofollow",
      },
    },
  );
}
