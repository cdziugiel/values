// app/(protected)/my/reports/composite/grants/[grantId]/print/route.ts

import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { reportAccessGrants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";

import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

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

  const [data, reportTemplateVersion] = await Promise.all([
    getPersonalCompositeReport({
      tenantSlug,
      respondentId: grant.subjectId,
      reportTemplateVersionId: grant.reportTemplateVersionId,
      frozenSelection,
      previewMode: false,
    }),
    getReportTemplateVersionForRender({
      reportTemplateVersionId: grant.reportTemplateVersionId,
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