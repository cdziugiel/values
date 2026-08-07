// app/(protected)/my/reports/composite/grants/[grantId]/pdf/route.ts

import { NextRequest } from "next/server";

import {
  getMyPersonalCompositeReportByGrantForCurrentUser,
} from "@/features/report-access/api/my-composite-report.queries";
import {
  getReportTemplateVersionForRender,
} from "@/features/report-builder/api/report-render.queries";
import {
  renderReportPdfFromHtml,
} from "@/features/report-builder/lib/render-report-pdf";
import {
  renderReportDocument,
} from "@/features/report-builder/lib/report-template-renderer";
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

function safeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (char) => {
      const map: Record<string, string> = {
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
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function errorSummary(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { grantId } = await params;

  const tenantSlug =
    request.nextUrl.searchParams.get("tenant")?.trim() || null;

  if (!tenantSlug) {
    return new Response("Brak kontekstu tenanta.", {
      status: 400,
    });
  }

  console.log("MY_COMPOSITE_PDF_START", {
    grantId,
    tenantSlug,
  });

  const data =
    await getMyPersonalCompositeReportByGrantForCurrentUser({
      tenantSlug,
      grantId,
    });

  if (!data) {
    console.warn("MY_COMPOSITE_PDF_NOT_FOUND", {
      grantId,
      tenantSlug,
    });

    return new Response(
      "Nie znaleziono dostępnego raportu złożonego.",
      { status: 404 },
    );
  }

  if (!data.eligibility.canRender) {
    console.warn("MY_COMPOSITE_PDF_NOT_RENDERABLE", {
      grantId,
      tenantSlug,
      eligibilityStatus: data.eligibility.status,
    });

    return new Response(
      "Nie można wygenerować raportu złożonego, ponieważ brakuje wymaganych danych źródłowych.",
      { status: 409 },
    );
  }

  const reportTemplateVersion =
    await getReportTemplateVersionForRender({
      reportTemplateVersionId: data.reportTemplateVersionId,
    });

  if (!reportTemplateVersion) {
    console.warn("MY_COMPOSITE_PDF_TEMPLATE_NOT_FOUND", {
      grantId,
      tenantSlug,
      reportTemplateVersionId: data.reportTemplateVersionId,
    });

    return new Response("Nie znaleziono szablonu raportu.", {
      status: 404,
    });
  }

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: data.payload,
  });

  console.log("MY_COMPOSITE_PDF_RENDER_START", {
    grantId,
    tenantSlug,
    reportTemplateVersionId: data.reportTemplateVersionId,
    visiblePages: rendered.visiblePages.length,
  });

  let pdf: Buffer;

  try {
    pdf = await renderReportPdfFromHtml({
      html: rendered.html,
      cookieHeader:
        request.headers.get("cookie") ?? undefined,
      baseUrl: resolveReportRenderOrigin(request),
    });
  } catch (error) {
    console.error("MY_COMPOSITE_PDF_RENDER_FAILED", {
      grantId,
      tenantSlug,
      error: errorSummary(error),
    });

    return new Response(
      "Nie udało się wygenerować pliku PDF. Spróbuj ponownie.",
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  const respondentPart = safeFilenamePart(
    data.respondent.displayName ||
      data.respondent.email ||
      data.respondent.externalCode ||
      "respondent",
  );

  const filename =
    [
      "humanet-composite-report",
      respondentPart || "respondent",
      data.grant.id,
    ].join("-") + ".pdf";

  console.log("MY_COMPOSITE_PDF_DONE", {
    grantId,
    tenantSlug,
    bytes: pdf.length,
  });

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
