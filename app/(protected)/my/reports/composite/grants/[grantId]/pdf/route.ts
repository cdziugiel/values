// app/(protected)/my/reports/composite/grants/[grantId]/pdf/route.ts

import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { reportAccessGrants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";

import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";
import { renderReportPdfFromUrl } from "@/features/report-builder/lib/render-report-pdf";

import type { FrozenCompositeSelection } from "@/features/assessment-results/types/personal-composite-selection.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    grantId: string;
  }>;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readFrozenSelection(metadata: unknown): FrozenCompositeSelection | null {
  const record = asRecord(metadata);
  const selection = record.compositeSelection;

  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    return null;
  }

  return selection as FrozenCompositeSelection;
}

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
  const { grantId } = await params;

  const tenantSlug = request.nextUrl.searchParams.get("tenant");

  if (!tenantSlug) {
    return new Response("Brak kontekstu tenanta.", {
      status: 400,
    });
  }

  const authSession = await requireSession();

  const [grant] = await controlDb
    .select()
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.id, grantId),
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.subjectType, "respondent"),
        eq(reportAccessGrants.userId, authSession.user.id),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    )
    .limit(1);

  if (!grant || !grant.subjectId || !grant.reportTemplateVersionId) {
    return new Response("Nie znaleziono dostępu do raportu złożonego.", {
      status: 404,
    });
  }

  const frozenSelection = readFrozenSelection(grant.metadata);

  if (!frozenSelection) {
    return new Response("Brak zamrożonego wyboru źródeł raportu.", {
      status: 409,
    });
  }

  const data = await getPersonalCompositeReport({
    tenantSlug,
    respondentId: grant.subjectId,
    reportTemplateVersionId: grant.reportTemplateVersionId,
    frozenSelection,
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
    `/my/reports/composite/grants/${grant.id}/print`,
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

  const filename = `humanet-composite-report-${respondentPart || "respondent"}-${grant.id}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}