import { and, eq, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";

import { reportAccessGrants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";
import type { FrozenCompositeSelection } from "@/features/assessment-results/types/personal-composite-selection.types";
import { renderReportPdfFromUrl } from "@/features/report-builder/lib/render-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
    respondentId: string;
    grantId: string;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readFrozenSelection(
  metadata: unknown,
): FrozenCompositeSelection | null {
  const record = asRecord(metadata);
  const selection = record.compositeSelection;

  if (
    !selection ||
    typeof selection !== "object" ||
    Array.isArray(selection)
  ) {
    return null;
  }

  return selection as FrozenCompositeSelection;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const {
    tenantSlug,
    projectId,
    respondentId,
    grantId,
  } = await params;

  const [grant] = await controlDb
    .select({
      id: reportAccessGrants.id,
      tenantSlug: reportAccessGrants.tenantSlug,
      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,
      assessmentProjectId:
        reportAccessGrants.assessmentProjectId,
      reportTemplateId:
        reportAccessGrants.reportTemplateId,
      reportTemplateVersionId:
        reportAccessGrants.reportTemplateVersionId,
      status: reportAccessGrants.status,
      metadata: reportAccessGrants.metadata,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.id, grantId),
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.subjectType, "respondent"),
        eq(reportAccessGrants.subjectId, respondentId),
        eq(
          reportAccessGrants.assessmentProjectId,
          projectId,
        ),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    )
    .limit(1);

  if (!grant?.reportTemplateVersionId) {
    return new Response("Brak dostępu do raportu.", {
      status: 403,
    });
  }

  const frozenSelection = readFrozenSelection(
    grant.metadata,
  );

  if (!frozenSelection) {
    return new Response(
      "Raport nie ma poprawnego wyboru źródeł.",
      {
        status: 404,
      },
    );
  }

  /*
   * Sprawdzamy, czy raport nadal może zostać wyrenderowany.
   * Strona print wykona tę samą kontrolę ponownie.
   */
  const data = await getPersonalCompositeReport({
    tenantSlug,
    assessmentProjectId: projectId,
    respondentId,
    reportTemplateVersionId:
      grant.reportTemplateVersionId,
    frozenSelection,
    previewMode: true,
  });

  if (!data || !data.eligibility.canRender) {
    return new Response(
      "Raport nie może zostać wygenerowany.",
      {
        status: 404,
      },
    );
  }

  const printUrl = new URL(
    `/t/${tenantSlug}` +
      `/assessment-projects/${projectId}` +
      `/respondents/${respondentId}` +
      `/composite-report/${grantId}/print`,
    request.nextUrl.origin,
  );

  const pdf = await renderReportPdfFromUrl({
    url: printUrl.toString(),
    cookieHeader:
      request.headers.get("cookie") ?? undefined,
  });

  const filename =
    `humanet-composite-report-` +
    `${respondentId}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}