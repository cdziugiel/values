// app/(protected)/my/reports/composite/grants/[grantId]/pdf/route.ts

import { NextRequest } from "next/server";

import {
  getMyPersonalCompositeReportByGrantForCurrentUser,
} from "@/features/report-access/api/my-composite-report.queries";

import {
  renderReportPdfFromUrl,
} from "@/features/report-builder/lib/render-report-pdf";

import {
  resolveReportRenderOrigin,
} from "@/features/report-builder/lib/resolve-report-render-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    grantId: string;
  }>;
};

function safeFilenamePart(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[ąćęłńóśźż]/g,
      (char) => {
        const map:
          Record<string, string> = {
            ą: "a",
            ć: "c",
            ę: "e",
            ł: "l",
            ń: "n",
            ó: "o",
            ś: "s",
            ź: "z",
            ż: "z",
          };

        return map[char] ?? char;
      },
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .slice(0, 80);
}

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
   * Używamy dokładnie tej samej ścieżki dostępu,
   * co działający ekran raportu composite.
   *
   * Nie używamy getPersonalCompositeReport(),
   * ponieważ ta funkcja wymaga tenant context/member
   * i dla zwykłego respondenta może wykonać redirect.
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

  const printUrl =
    new URL(
      `/my/reports/composite/grants/${grantId}/print`,
      resolveReportRenderOrigin(
        request,
      ),
    );

  printUrl.searchParams.set(
    "tenant",
    tenantSlug,
  );

  /**
   * Wspólnego renderera NIE zmieniamy.
   * Standardowe raporty działają na tej ścieżce.
   */
  const pdf =
    await renderReportPdfFromUrl({
      url: printUrl.toString(),
      cookieHeader:
        request.headers.get(
          "cookie",
        ) ?? undefined,
    });

  const respondentPart =
    safeFilenamePart(
      data.respondent.displayName ||
        data.respondent.email ||
        data.respondent.externalCode ||
        "respondent",
    );

  const filename =
    [
      "humanet-composite-report",
      respondentPart ||
        "respondent",
      grantId,
    ].join("-") + ".pdf";

  return new Response(
    new Uint8Array(pdf),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/pdf",

        "Content-Disposition":
          `attachment; filename="${filename}"`,

        "Cache-Control":
          "private, no-store",

        "X-Content-Type-Options":
          "nosniff",
      },
    },
  );
}
