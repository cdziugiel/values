// app/(protected)/my/reports/composite/[reportTemplateVersionId]/pdf/route.ts

import { NextRequest } from "next/server";

import {
  getActiveReportAccessGrantForSubject,
  resolveRespondentForCurrentUser,
} from "@/features/report-access/api/report-access.queries";

import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";
import { requireSession } from "@/server/auth/require-session";
import { renderReportPdfFromUrl } from "@/features/report-builder/lib/render-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    reportTemplateVersionId: string;
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

  /**
   * Opcjonalna, ale użyteczna walidacja przed uruchomieniem Playwrighta.
   * Dzięki temu nie renderujemy PDF-a, jeśli composite utracił wymagane źródła.
   */
  const data = await getPersonalCompositeReport({
    tenantSlug,
    respondentId: resolved.respondent.id,
    reportTemplateVersionId,
    previewMode: false,
  });

  if (!data) {
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

  const printUrl = new URL(
    `/my/reports/composite/${reportTemplateVersionId}/print`,
    request.nextUrl.origin,
  );

  printUrl.searchParams.set("tenant", tenantSlug);

  const pdf = await renderReportPdfFromUrl({
    url: printUrl.toString(),
    cookieHeader: request.headers.get("cookie") ?? undefined,
  });

  const respondentPart = safeFilenamePart(
    data.respondent.displayName || data.respondent.email || "respondent",
  );

  const filename = `humanet-composite-report-${respondentPart || "respondent"}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}